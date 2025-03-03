import requests
import json
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore, initialize_app
import os
from dotenv import load_dotenv
import sys
import math
import traceback
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

# Load environment variables
load_dotenv()

# Add this dictionary at the top of the file with common Bay Area locations
BAY_AREA_LOCATIONS = {
    'lake chabot': {'latitude': 37.7275, 'longitude': -122.1142},
    'golden gate park': {'latitude': 37.7694, 'longitude': -122.4862},
    'lake merced': {'latitude': 37.7280, 'longitude': -122.4939},
    'crissy field': {'latitude': 37.8039, 'longitude': -122.4697},
    'presidio': {'latitude': 37.7989, 'longitude': -122.4662},
    'angel island': {'latitude': 37.8609, 'longitude': -122.4326},
    'tilden park': {'latitude': 37.8981, 'longitude': -122.2435},
    'mt tamalpais': {'latitude': 37.9235, 'longitude': -122.5965},
    'muir woods': {'latitude': 37.8970, 'longitude': -122.5811},
    'fort funston': {'latitude': 37.7182, 'longitude': -122.5044},
    'lands end': {'latitude': 37.7827, 'longitude': -122.5110},
    'marin headlands': {'latitude': 37.8270, 'longitude': -122.4994},
    'berkeley marina': {'latitude': 37.8644, 'longitude': -122.3108}
}

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if app is already initialized
        try:
            app = firebase_admin.get_app()
            print("\nUsing existing Firebase app")
            print(f"Project ID: {app.project_id}")
        except ValueError:
            # Initialize new app if none exists
            print("\nInitializing new Firebase app...")
            cred = credentials.Certificate('scripts/serviceAccountKey.json')
            app = firebase_admin.initialize_app(cred)
            print(f"Successfully initialized Firebase app")
            print(f"Project ID: {app.project_id}")
        
        # Get Firestore client and test connection
        db = firestore.client()
        
        # Test write access with a temporary document
        test_ref = db.collection('events').document('_test_doc')
        test_ref.set({'test': True})
        test_doc = test_ref.get()
        if test_doc.exists:
            print("✅ Successfully verified write access to Firestore")
            test_ref.delete()  # Clean up test document
        else:
            print("❌ Failed to verify write access")
            return False
            
        return True
            
    except Exception as e:
        print(f"❌ Error initializing Firebase: {str(e)}")
        traceback.print_exc()
        return False

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in miles using Haversine formula"""
    try:
        # Convert coordinates to float if they're strings
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        
        R = 3959  # Earth's radius in miles
        
        # Convert coordinates to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    except (ValueError, TypeError) as e:
        print(f"Error calculating distance: {str(e)}")
        print(f"Input coordinates: lat1={lat1}, lon1={lon1}, lat2={lat2}, lon2={lon2}")
        return float('inf')  # Return infinity for invalid coordinates

def fetch_events(event_type='running_race'):
    """Fetch events from RunSignUp API"""
    print(f"\nFetching {event_type} events...")
    
    base_url = 'https://runsignup.com/rest/races'
    params = {
        'format': 'json',
        'event_type': event_type,
        'start_date': (datetime.now()).strftime('%Y-%m-%d'),
        'end_date': (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
        'zipcode': '94115',
        'radius': 50,
        'page': 1,
        'results_per_page': 25,
        'state': 'CA'
    }
    
    processed_events = []
    total_processed = 0
    total_skipped = 0
    max_retries = 3
    
    while True:
        try:
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('races'):
                print("\nNo more events found")
                break
                
            events = data['races']
            
            # Process events
            for event in events:
                processed_event = process_event(event)
                if processed_event:
                    processed_events.append(processed_event)
                    
                    # Save in batches of 25
                    if len(processed_events) >= 25:
                        save_events_to_firestore(processed_events)
                        processed_events = []
            
            # Save any remaining events
            if processed_events:
                save_events_to_firestore(processed_events)
                processed_events = []
            
            # Check if we've reached the end
            if len(events) < params['results_per_page']:
                print(f"\nReached end of results for {event_type}")
                break
                
            params['page'] += 1
            
        except Exception as e:
            print(f"\nError fetching page {params['page']}: {str(e)}")
            break
    
    return True

def is_in_california(event):
    try:
        # Check various location fields that might contain state info
        location_fields = [
            event.get('address', {}).get('state', ''),
            event.get('address', {}).get('state_province', ''),
            event.get('location', ''),
            event.get('address_text', '')
        ]
        
        # Look for CA or California in any of the location fields
        for field in location_fields:
            if field and isinstance(field, str):
                if field.upper() == 'CA' or 'CALIFORNIA' in field.upper():
                    return True
                
        print(f"Event not in California - Location data: {location_fields}")
        return False
    except Exception as e:
        print(f"Error checking location for event {event.get('name')}: {str(e)}")
        return False

def get_coordinates(address_components):
    """Convert address components to coordinates using geocoding"""
    geolocator = Nominatim(user_agent="blister_app")
    
    # First try the full address
    address_str = ", ".join(filter(None, [
        address_components.get('address', ''),
        address_components.get('city', ''),
        address_components.get('state', ''),
        address_components.get('country', '')
    ]))
    
    # Check for known locations in the address
    address_lower = address_str.lower()
    for location, coords in BAY_AREA_LOCATIONS.items():
        if location in address_lower:
            print(f"✅ Found known location: {location}")
            return coords
    
    if not address_str.strip():
        return None
        
    # Try geocoding the full address first
    location = try_geocoding(address_str)
    if location:
        return location
    
    # If full address fails, try city + state
    city_state = f"{address_components.get('city', '')}, {address_components.get('state', '')}"
    if city_state.strip(',').strip():
        print(f"Trying city/state only: {city_state}")
        location = try_geocoding(city_state)
        if location:
            return location
    
    return None

def try_geocoding(address_str):
    """Helper function to try geocoding with retries"""
    geolocator = Nominatim(user_agent="blister_app")
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            location = geolocator.geocode(address_str)
            if location:
                return {
                    'latitude': location.latitude,
                    'longitude': location.longitude
                }
            time.sleep(1)  # Rate limiting
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            if attempt == max_retries - 1:
                print(f"Failed to geocode address after {max_retries} attempts: {address_str}")
                return None
            time.sleep(2 ** attempt)  # Exponential backoff
    return None

def process_event(event_wrapper):
    """Process a single event from the API response"""
    try:
        event = event_wrapper.get('race', {})
        
        # Skip events missing required fields
        if not event.get('race_id') or not event.get('name'):
            return None
            
        # Get address components silently
        address_data = event.get('address', {})
        address_text = event.get('address_text', '')
        
        # Process address components silently
        if address_text:
            address_parts = address_text.split('\n')
            if len(address_parts) >= 2:
                location_parts = address_parts[-1].split(',')
                if len(location_parts) >= 2:
                    city_state = location_parts[1].strip().split()
                    address_components = {
                        'address': address_parts[0].strip(),
                        'city': location_parts[0].strip(),
                        'state': city_state[0] if city_state else '',
                        'country': 'USA'
                    }
                else:
                    address_components = {
                        'address': address_text,
                        'city': address_data.get('city', ''),
                        'state': address_data.get('state', ''),
                        'country': 'USA'
                    }
            else:
                address_components = {
                    'address': address_text,
                    'city': address_data.get('city', ''),
                    'state': address_data.get('state', ''),
                    'country': 'USA'
                }
        else:
            address_components = {
                'address': address_data.get('street', ''),
                'city': address_data.get('city', ''),
                'state': address_data.get('state', ''),
                'country': 'USA'
            }
        
        # Get coordinates silently
        lat = float(event.get('address', {}).get('latitude', 0))
        lon = float(event.get('address', {}).get('longitude', 0))
        
        if lat == 0 or lon == 0:
            geocoded = get_coordinates(address_components)
            if geocoded:
                lat = geocoded['latitude']
                lon = geocoded['longitude']
            else:
                return None
        
        # Calculate distance from SF silently
        sf_lat, sf_lon = 37.7749, -122.4194
        distance = calculate_distance(sf_lat, sf_lon, lat, lon)
        
        event_type = determine_event_type(event, event.get('event_type', 'running_race'))
        
        event_data = {
            'id': f"runsignup_{event['race_id']}",
            'title': event['name'],
            'date': event['next_date'],
            'location': {
                **address_components,
                'coordinates': {
                    'latitude': float(lat),
                    'longitude': float(lon)
                }
            },
            'type': event_type,
            'sourceUrl': event.get('url', ''),
            'distanceFromSF': float(round(distance, 1)),
            'distances': extract_distances(event),
            'description': event.get('description', ''),
            'price': extract_price_info(event),
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'source': 'RunSignUp',
            'created': firestore.SERVER_TIMESTAMP
        }
        
        print(f"✓ {event_data['title']} ({event_data['type']})")
        return event_data
        
    except Exception as e:
        return None

def determine_event_type(event, base_type):
    """Determine the specific type of event based on various criteria"""
    # First check the API's event_type field
    api_event_type = event.get('event_type', '').lower()
    
    print(f"API event type: {api_event_type}")
    
    # If API explicitly says it's a triathlon, trust that
    if api_event_type == 'triathlon':
        print("✅ Confirmed triathlon from API event_type")
        return 'tri'
    
    # For other events, check the name and description
    name = event.get('name', '').lower()
    description = event.get('description', '').lower() if event.get('description') else ''
    distances = [str(d).lower() for d in event.get('distances', [])]
    distance_str = ' '.join(distances)
    
    # Only classify as tri if there are very clear triathlon indicators
    tri_keywords = ['triathlon', 'ironman', '70.3', 'swim.bike.run', 'swim bike run']
    if any(keyword in name for keyword in tri_keywords) or \
       any(keyword in description for keyword in tri_keywords):
        print("✅ Identified as triathlon from name/description")
        return 'tri'
    
    # Check for ultra events
    if any(word in name or word in description or word in distance_str 
        for word in ['ultra', '50k', '50m', '100k', '100m', '50 mile', '100 mile']):
        print("✅ Identified as ultra event")
        return 'ultra'
    
    # Check for trail events
    if any(word in name or word in description 
        for word in ['trail', 'mountain', 'hills', 'wilderness', 'forest', 'park', 'ridge']):
        print("✅ Identified as trail event")
        return 'trail'
    
    # Check for track events
    if any(word in name or word in description 
        for word in ['track', 'stadium', 'oval']):
        print("✅ Identified as track event")
        return 'track'
    
    # Default to road
    print("✅ Defaulting to road event")
    return 'road'

def extract_distances(event):
    """Extract standardized distance information from event data"""
    distances = []
    
    # Try to get distances from the API's distances field
    api_distances = event.get('distances', [])
    if api_distances:
        distances.extend([str(d).strip() for d in api_distances if d])
    
    # Try to get distances from the event name and description
    name = event.get('name', '').lower()
    description = event.get('description', '').lower() if event.get('description') else ''
    
    # Common race distances and their variations
    distance_patterns = {
        'marathon': ['marathon', '26.2', '26.2m', '26.2 miles'],
        'half': ['half marathon', 'half-marathon', '13.1', '13.1m', '13.1 miles'],
        '10k': ['10k', '10 k', '10 km', '10km', '6.2 miles'],
        '5k': ['5k', '5 k', '5 km', '5km', '3.1 miles'],
        'ultra': ['50k', '50m', '100k', '100m', '50 mile', '100 mile']
    }
    
    # Search for distance patterns in name and description
    text_to_search = f"{name} {description}"
    for distance_type, patterns in distance_patterns.items():
        if any(pattern in text_to_search for pattern in patterns):
            if distance_type not in distances:
                distances.append(distance_type)
    
    return list(set(distances))  # Remove duplicates

def extract_price_info(event):
    """Extract price information if available"""
    price_info = event.get('price_info', {})
    if not price_info:
        return None
    
    return {
        'amount': price_info.get('amount'),
        'currency': price_info.get('currency', 'USD'),
        'endDate': price_info.get('end_date')
    }

def verify_event_data(event):
    """Verify event data is properly structured for Firestore"""
    required_fields = ['id', 'title', 'date', 'location']
    
    # Check required fields
    for field in required_fields:
        if field not in event:
            print(f"❌ Missing required field: {field}")
            return False
    
    # Check data types
    if not isinstance(event['id'], str):
        print("❌ ID must be a string")
        return False
    
    # Verify location structure
    if not isinstance(event['location'], dict):
        print("❌ Location must be a dictionary")
        return False
    
    if 'coordinates' not in event['location']:
        print("❌ Missing coordinates in location")
        return False
    
    # Print the full event data for debugging
    print("\nEvent data to be saved:")
    print(json.dumps(event, indent=2, default=str))
    
    return True

def save_events_to_firestore(events):
    """Save events to Firestore events collection"""
    try:
        db = firestore.client()
        new_count = 0
        update_count = 0
        BATCH_SIZE = 25  # Increased to 25 for faster processing
        
        # Create a batch
        batch = db.batch()
        batch_count = 0
        
        for event in events:
            try:
                doc_ref = db.collection('events').document(event['id'])
                doc = doc_ref.get()
                is_new = not doc.exists
                
                # Add to batch
                batch.set(doc_ref, event)
                batch_count += 1
                
                if is_new:
                    new_count += 1
                else:
                    update_count += 1
                
                # Commit when batch size is reached
                if batch_count >= BATCH_SIZE:
                    batch.commit()
                    print(f"📝 Batch: +{new_count} new, ~{update_count} updated")
                    batch = db.batch()
                    batch_count = 0
                
            except Exception:
                continue
        
        # Commit any remaining documents
        if batch_count > 0:
            batch.commit()
            print(f"📝 Final batch: +{new_count} new, ~{update_count} updated")
            
        return True
        
    except Exception:
        return False

def delete_non_california_events():
    try:
        db = firestore.client()
        batch_size = 500
        deleted_count = 0
        
        # Query all events
        events_ref = db.collection('events')
        query = events_ref.stream()
        
        # Process in batches
        current_batch = db.batch()
        current_count = 0
        
        for doc in query:
            event_data = doc.to_dict()
            if not is_in_california(event_data):
                current_batch.delete(doc.reference)
                current_count += 1
                deleted_count += 1
                
                # If we've reached batch size, commit and start new batch
                if current_count >= batch_size:
                    current_batch.commit()
                    current_batch = db.batch()
                    current_count = 0
                    print(f"Deleted batch of {batch_size} non-California events. Total deleted: {deleted_count}")
        
        # Commit any remaining deletes
        if current_count > 0:
            current_batch.commit()
            print(f"Deleted final batch of {current_count} non-California events")
            
        print(f"Total non-California events deleted: {deleted_count}")
        
    except Exception as e:
        print(f"Error deleting non-California events: {str(e)}")

def process_race(race):
    """Process a single race and prepare it for Firestore"""
    # ... existing race processing code ...
    
    # Extract address components
    address_components = {
        'address': race.get('address', ''),
        'city': race.get('city', ''),
        'state': race.get('state', ''),
        'country': race.get('country', '')
    }
    
    # Get coordinates
    coordinates = get_coordinates(address_components)
    
    race_data = {
        'id': str(race['race_id']),
        'name': race.get('name', ''),
        'description': race.get('description', ''),
        'startDate': race.get('start_date', ''),
        'location': {
            **address_components,
            'coordinates': coordinates or {}  # Include coordinates if found
        },
        'url': race.get('url', ''),
        'lastUpdated': firestore.SERVER_TIMESTAMP
    }
    
    return race_data

def test_firestore_save():
    """Test function to validate Firestore saving functionality"""
    print("\n🧪 Starting Firestore save test...")
    
    try:
        db = firestore.client()
        events_ref = db.collection('events')
        
        # Print available collections
        collections = [c.id for c in db.collections()]
        print(f"Available collections: {collections}")
        
        # Create a test event
        test_event = {
            'id': 'test_event_001',
            'title': 'Test Event',
            'date': datetime.now().strftime('%Y-%m-%d'),
            'type': 'test',
            'description': 'This is a test event'
        }
        
        print(f"\nAttempting to save test event...")
        
        # Try direct save first
        doc_ref = events_ref.document(test_event['id'])
        doc_ref.set(test_event)
        
        # Verify the save
        time.sleep(1)
        saved_doc = doc_ref.get()
        
        if saved_doc.exists:
            print("✅ Direct save successful!")
            print(f"Saved data: {saved_doc.to_dict()}")
        else:
            print("❌ Direct save failed - document not found")
        
        # Try batch save
        print("\nTesting batch save...")
        batch = db.batch()
        batch.set(doc_ref, {'batch_test': True}, merge=True)
        batch.commit()
        
        # Verify batch save
        time.sleep(1)
        saved_doc = doc_ref.get()
        if saved_doc.exists and saved_doc.get('batch_test'):
            print("✅ Batch save successful!")
        else:
            print("❌ Batch save failed")
        
        # Clean up
        doc_ref.delete()
        print("\n🧹 Test cleanup complete")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        traceback.print_exc()
        return False

def test_direct_save():
    """Test direct document save to Firestore"""
    print("\n🧪 Testing direct document save...")
    try:
        db = firestore.client()
        test_ref = db.collection('events').document('test_doc')
        
        test_data = {
            'id': 'test_doc',
            'title': 'Test Event',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'number': 42,
            'string': 'test',
            'array': ['a', 'b', 'c'],
            'map': {'key': 'value'}
        }
        
        # Try direct save
        test_ref.set(test_data)
        time.sleep(1)
        
        # Verify save
        saved = test_ref.get()
        if saved.exists:
            print("✅ Test save successful!")
            print(f"Saved data: {saved.to_dict()}")
            test_ref.delete()  # Clean up
            return True
        else:
            print("❌ Test save failed!")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        traceback.print_exc()
        return False

def verify_firestore_saves(event_ids):
    """Verify that events were actually saved to Firestore"""
    print("\n🔍 Verifying saved events...")
    db = firestore.client()
    events_ref = db.collection('events')
    
    found = 0
    missing = 0
    
    for event_id in event_ids:
        doc = events_ref.document(event_id).get()
        if doc.exists:
            found += 1
            print(f"✅ Found event: {doc.get('title')}")
        else:
            missing += 1
            print(f"❌ Missing event: {event_id}")
    
    print(f"\nVerification complete:")
    print(f"Found: {found}")
    print(f"Missing: {missing}")
    
    return found > 0

def normalize_event_distances():
    """Normalize distance field names in existing events"""
    print("\n🔄 Normalizing event distances...")
    try:
        db = firestore.client()
        events_ref = db.collection('events')
        batch = db.batch()
        batch_count = 0
        updated_count = 0
        
        # Get all events
        for doc in events_ref.stream():
            event_data = doc.to_dict()
            needs_update = False
            
            # Check for old 'Distance' field
            if 'Distance' in event_data and 'distances' not in event_data:
                event_data['distances'] = event_data['Distance']
                del event_data['Distance']
                needs_update = True
            
            if needs_update:
                batch.set(doc.reference, event_data)
                batch_count += 1
                updated_count += 1
                
                # Commit batch when it reaches limit
                if batch_count >= 500:
                    batch.commit()
                    batch = db.batch()
                    batch_count = 0
        
        # Commit any remaining updates
        if batch_count > 0:
            batch.commit()
        
        print(f"✅ Updated {updated_count} events with normalized distance fields")
        return True
        
    except Exception as e:
        print(f"❌ Error normalizing distances: {str(e)}")
        return False

def main():
    """Main function to orchestrate the event fetching process"""
    try:
        if not initialize_firebase():
            print("Failed to initialize Firebase")
            return
        
        # Fetch and save running events
        print("\n📡 Fetching running events...")
        if fetch_events('running_race'):
            print("✅ Running events processed")
        
        # Fetch and save triathlon events
        print("\n📡 Fetching triathlon events...")
        if fetch_events('triathlon'):
            print("✅ Triathlon events processed")
        
        # Normalize distance fields
        normalize_event_distances()
        
        print("\n✨ All events have been processed and saved!")
            
    except Exception as e:
        print(f"❌ Error in main function: {str(e)}")
        raise e

if __name__ == "__main__":
    main() 