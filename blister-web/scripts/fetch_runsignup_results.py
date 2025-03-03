import firebase_admin
from firebase_admin import credentials, firestore
import requests
import time
from datetime import datetime
import os
import json

# Get the path to the service account key relative to the script location
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))  # Go up to project root
cred_path = os.path.join(script_dir, 'serviceAccountKey.json')

# Initialize Firebase
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def fetch_race_events(race_id):
    """Fetch available events for a race"""
    url = f"https://runsignup.com/Rest/race/{race_id}"
    params = {'format': 'json'}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if 'race' in data and 'events' in data['race']:
            return data['race']['events']
        return []
    except Exception as e:
        print(f"Error fetching events for race {race_id}: {e}")
        return []

def fetch_race_results(race_id, event_id):
    """Fetch results for a single race event"""
    url = f"https://runsignup.com/Rest/race/{race_id}/results"
    params = {
        'format': 'json',
        'event_id': event_id
    }
    
    try:
        print(f"\nFetching results for race {race_id}, event {event_id}")
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if 'error' in data:
            print(f"API Error: {data['error']}")
            return None
        
        # Check for individual_results_sets structure
        if 'individual_results_sets' in data:
            result_sets = data['individual_results_sets']
            print(f"Found {len(result_sets)} result sets")
            
            all_results = []
            for result_set in result_sets:
                print(f"Processing result set: {result_set.get('individual_result_set_name', 'unnamed')}")
                # Results are directly in the 'results' key
                if 'results' in result_set:
                    results = result_set['results']
                    print(f"Found {len(results)} results")
                    all_results.extend(results)
                else:
                    print("No results in result set")
                    print("Result set keys:", list(result_set.keys()))
            
            if all_results:
                print(f"Total results found: {len(all_results)}")
                return {
                    'results': all_results,
                    'source': 'individual_results_sets'
                }
            
        print('Response data:', {
            'hasResults': 'results' in data,
            'hasRaceResults': 'race_results' in data,
            'hasIndividualResultsSets': 'individual_results_sets' in data,
            'keys': list(data.keys())
        })
            
    except Exception as e:
        print(f"Error fetching results: {e}")
    
    return None

def process_results(race_id, results_data, race_event):
    """Process and store results in Firebase"""
    if not results_data:
        print(f"No results data for race {race_id}")
        return 0
        
    # Get results array from any of the possible formats
    results = results_data.get('results', [])
    
    if not results:
        print(f"No results found in data for race {race_id}")
        print("Data structure:", list(results_data.keys()))
        return 0
    
    print(f"\nProcessing {len(results)} results")
    
    # Extract event details
    event_details = {
        'event_name': race_event.get('name'),
        'event_date': race_event.get('start_time'),
        'event_distance': race_event.get('distance'),
        'event_distance_unit': race_event.get('distance_unit'),
        'event_type': race_event.get('type'),
        'event_id': race_id,
        'source_event_id': race_event.get('event_id')
    }
    
    print(f"Event details: {event_details}")

    def clean_time(time_value):
        """Clean and standardize time values"""
        if not time_value or time_value == "":
            return None
            
        # Sometimes time comes as seconds
        try:
            if isinstance(time_value, (int, float)):
                hours = int(time_value // 3600)
                minutes = int((time_value % 3600) // 60)
                seconds = int(time_value % 60)
                return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
            # Handle MM:SS format (add hours)
            if isinstance(time_value, str) and len(time_value.split(':')) == 2:
                return f"00:{time_value}"
                
            return str(time_value)
        except:
            print(f"Error cleaning time value: {time_value}")
            return None

    def clean_place(place_value):
        """Clean and standardize placement values"""
        if not place_value:
            return None
        try:
            # Handle string numbers and integers
            return int(str(place_value).strip())
        except (ValueError, TypeError):
            # Log unexpected place values
            print(f"Warning: Invalid placement value: {place_value}")
            return None

    def extract_time_fields(result):
        """Extract all possible time fields from a result"""
        time_fields = {
            'chip_time': result.get('chip_time'),
            'gun_time': result.get('gun_time'),
            'finish_time': result.get('finish_time'),
            'time': result.get('time'),
            'net_time': result.get('net_time'),
            'elapsed_time': result.get('elapsed_time'),
            'finish_time_formatted': result.get('finish_time_formatted'),
            'duration': result.get('duration'),
            'total_time': result.get('total_time'),
            # Check nested structures
            'timing': result.get('timing', {}),
            'results_time': result.get('results', {}).get('time'),
            'results_finish_time': result.get('results', {}).get('finish_time'),
            'result_time': result.get('result', {}).get('time'),
            'raw_time': result.get('raw_time'),
            'split_time': result.get('split_time')
        }
        return time_fields

    batch = db.batch()
    stored_count = 0
    missing_times = 0
    has_placement_no_time = 0
    
    # Add summary stats
    total_results = len(results)
    results_with_times = 0
    results_with_placement = 0
    
    for result in results:
        try:
            athlete_name = f"{result.get('first_name', '')} {result.get('last_name', '')}".strip()
            if not athlete_name:
                continue

            # Extract and log all time fields
            time_fields = extract_time_fields(result)
            print(f"\nTime fields for {athlete_name}:")
            print(json.dumps(time_fields, indent=2))

            # Try to get finish time from any available field
            finish_time = None
            for field_name, value in time_fields.items():
                if value and not finish_time:
                    finish_time = clean_time(value)
                    if finish_time:
                        print(f"Found time in {field_name}: {finish_time}")
                        break

            # Log warning if we have placement but no time
            placement = result.get('overall_place') or result.get('place_overall')
            if placement and not finish_time:
                has_placement_no_time += 1
                print(f"\nWARNING: Found placement {placement} but no time for {athlete_name}")
                print("Raw result data:", json.dumps(result, indent=2))
            elif not finish_time:
                missing_times += 1

            # Update stats
            if finish_time:
                results_with_times += 1
            if placement:
                results_with_placement += 1

            # Create result document
            result_doc = {
                **event_details,
                'athlete_name': athlete_name,
                'finish_time': finish_time,
                'placement_overall': clean_place(result.get('overall_place') or result.get('place_overall')),
                'placement_gender': clean_place(result.get('gender_place')),
                'placement_division': clean_place(result.get('division_place')),
                'bib': result.get('bib'),
                'gender': result.get('gender'),
                'age': result.get('age'),
                'division': result.get('division'),
                'city': result.get('city'),
                'state': result.get('state'),
                'raw_time_data': time_fields,  # Store all time fields for debugging
                'lastUpdated': firestore.SERVER_TIMESTAMP,
                'source': 'runsignup'  # Add source tracking
            }

            # Check for existing result
            existing_results = db.collection('race_results').where(
                'event_id', '==', race_id
            ).where(
                'athlete_name', '==', athlete_name
            ).where(
                'source_event_id', '==', race_event.get('event_id')
            ).limit(1).stream()

            existing_docs = list(existing_results)
            if existing_docs:
                # Update existing document
                doc_ref = existing_docs[0].reference
                batch.update(doc_ref, result_doc)
                print(f"Updating existing result for {athlete_name}")
            else:
                # Create new document
                doc_ref = db.collection('race_results').document()
                batch.set(doc_ref, result_doc)
                print(f"Adding new result for {athlete_name}")

            stored_count += 1
            
            # Commit in smaller batches
            if stored_count % 10 == 0:
                batch.commit()
                print(f"\nCommitted batch of 10 results")
                batch = db.batch()
                time.sleep(1)  # Rate limiting
                
        except Exception as e:
            print(f"Error processing result: {e}")
            continue
            
    # Commit any remaining results
    if stored_count % 10 != 0:
        batch.commit()
        print(f"\nCommitted final batch of {stored_count % 10} results")
        
    # Print summary at end of processing
    print("\nResults Summary:")
    print(f"Total results processed: {total_results}")
    print(f"Results with times: {results_with_times} ({(results_with_times/total_results)*100:.1f}%)")
    print(f"Results with placement: {results_with_placement} ({(results_with_placement/total_results)*100:.1f}%)")
    print(f"Results with placement but no time: {has_placement_no_time}")
    print(f"Results missing both time and placement: {missing_times}")
    
    return stored_count

def main():
    print("Fetching RunSignUp events from Firebase...")
    
    # Add pagination and batch processing
    BATCH_SIZE = 50  # Process events in smaller batches
    last_doc = None
    total_processed = 0
    total_results = 0
    retry_count = 0
    MAX_RETRIES = 3

    while True:
        try:
            # Create base query
            query = db.collection('runsignup_past_events').where('source', '==', 'runsignup')
            
            # Add pagination if we have a last document
            if last_doc:
                query = query.start_after(last_doc)
            
            # Limit batch size
            query = query.limit(BATCH_SIZE)
            
            # Execute query
            event_docs = list(query.stream())
            
            # Break if no more events
            if not event_docs:
                break
                
            # Process this batch of events
            for event_doc in event_docs:
                try:
                    event_data = event_doc.to_dict()
                    race_id = event_data.get('sourceId')
                    
                    if not race_id:
                        continue
                        
                    print(f"\nProcessing race: {event_data.get('name')} ({race_id})")
                    
                    # First get all events for this race
                    race_events = fetch_race_events(race_id)
                    if not race_events:
                        print(f"No events found for race {race_id}")
                        continue
                        
                    print(f"Found {len(race_events)} events")
                    
                    # Process each event
                    for race_event in race_events:
                        event_id = race_event.get('event_id')
                        if not event_id:
                            continue
                            
                        print(f"\nProcessing event: {race_event.get('name')} ({event_id})")
                        results = fetch_race_results(race_id, event_id)
                        
                        if results:
                            stored = process_results(race_id, results, race_event)
                            total_results += stored
                            total_processed += 1
                            print(f"Stored {stored} new results")
                            time.sleep(2)  # Rate limiting between events
                        
                    time.sleep(1)  # Rate limiting between races
                    
                except Exception as e:
                    print(f"Error processing event {event_doc.id}: {str(e)}")
                    continue
            
            # Update last_doc for next iteration
            last_doc = event_docs[-1]
            retry_count = 0  # Reset retry count on successful batch
            
        except Exception as e:
            retry_count += 1
            if retry_count > MAX_RETRIES:
                print(f"Max retries ({MAX_RETRIES}) exceeded. Stopping.")
                break
                
            print(f"Error fetching batch (attempt {retry_count}/{MAX_RETRIES}): {str(e)}")
            time.sleep(retry_count * 5)  # Exponential backoff
            continue
            
    print(f"\nCompleted! Processed {total_processed} events, stored {total_results} results")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScript interrupted by user")
    except Exception as e:
        print(f"\nScript failed with error: {str(e)}") 