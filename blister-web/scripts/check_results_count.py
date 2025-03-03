import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime

# Get the path to the service account key relative to the script location
script_dir = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(script_dir, 'serviceAccountKey.json')

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def format_firestore_doc(doc_dict):
    """Convert Firestore types to standard Python types for printing"""
    formatted = {}
    for key, value in doc_dict.items():
        if isinstance(value, datetime):
            formatted[key] = value.isoformat()
        else:
            formatted[key] = value
    return formatted

def check_results():
    try:
        # Get all results
        results_ref = db.collection('race_results')
        
        # Get a sample result to check data structure
        sample = next(results_ref.limit(1).stream())
        print("\nSample result data structure:")
        sample_dict = format_firestore_doc(sample.to_dict())
        for key, value in sample_dict.items():
            print(f"{key}: {value}")
        
        # Get all results
        all_results = list(results_ref.stream())
        total_results = len(all_results)
        
        # Print some sample athlete names
        print("\nSample athlete names:")
        for doc in all_results[:5]:
            data = doc.to_dict()
            print(f"- {data.get('athlete_name', 'N/A')}")
        
        # Get results with times
        with_times_ref = results_ref.where('finish_time', '!=', None)
        results_with_times = len(list(with_times_ref.stream()))
        
        # Get RunSignUp results
        runsignup_ref = results_ref.where('source', '==', 'runsignup')
        runsignup_results = len(list(runsignup_ref.stream()))
        
        # Calculate percentage if we have results
        time_percentage = (results_with_times / total_results * 100) if total_results > 0 else 0
        
        print("\nResults Statistics:")
        print(f"Total results: {total_results:,}")
        print(f"Results with finish times: {results_with_times:,} ({time_percentage:.1f}% of total)")
        print(f"RunSignUp results: {runsignup_results:,}")
        
        # Add some event stats
        events_ref = db.collection('runsignup_past_events')
        total_events = len(list(events_ref.stream()))
        print(f"\nTotal RunSignUp events: {total_events:,}")
        print(f"Average results per event: {(runsignup_results/total_events):.1f}" if total_events > 0 else "No events found")

        # Search for specific athlete
        print("\nSearching for 'Shattuck':")
        shattuck_results = [
            doc.to_dict() for doc in all_results 
            if 'athlete_name' in doc.to_dict() 
            and 'shattuck' in doc.to_dict()['athlete_name'].lower()
        ]
        if shattuck_results:
            print(f"Found {len(shattuck_results)} results:")
            for result in shattuck_results:
                print(f"- {result.get('athlete_name')} - {result.get('event_name')} - {result.get('finish_time')}")
        else:
            print("No results found")

    except Exception as e:
        print(f"Error getting statistics: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_results() 