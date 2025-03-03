import requests
import time
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import re

def initialize_firebase():
    try:
        cred = credentials.Certificate('scripts/serviceAccountKey.json')
        firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

def get_coordinates(location):
    """Return coordinates for known locations"""
    location_coords = {
        'lake tahoe': {'latitude': 39.0968, 'longitude': -120.0324},
        'santa cruz': {'latitude': 36.9741, 'longitude': -122.0308},
        'sacramento': {'latitude': 38.5816, 'longitude': -121.4944},
        'san francisco': {'latitude': 37.7749, 'longitude': -122.4194},
        'oakland': {'latitude': 37.8044, 'longitude': -122.2712},
        'berkeley': {'latitude': 37.8715, 'longitude': -122.2730},
        'santa rosa': {'latitude': 38.4404, 'longitude': -122.7141},
        'morgan hill': {'latitude': 37.1305, 'longitude': -121.6544},
        'granite beach': {'latitude': 38.7520, 'longitude': -121.1401},
        'folsom lake': {'latitude': 38.7242, 'longitude': -121.1482},
        'uvas': {'latitude': 37.0679, 'longitude': -121.6919},
        'pleasanton': {'latitude': 37.6624, 'longitude': -121.8747},
        'rancho seco': {'latitude': 38.3442, 'longitude': -121.1195},
        'shadow cliffs': {'latitude': 37.6745, 'longitude': -121.8774},
        'bass lake': {'latitude': 37.3229, 'longitude': -119.5669},
        'omaha': {'latitude': 41.2565, 'longitude': -95.9345},
        'lake san antonio': {'latitude': 35.9074, 'longitude': -121.0858},
        'arroyo grande': {'latitude': 35.1186, 'longitude': -120.5908}
    }
    
    # Check if location contains any known places
    location_lower = location['address'].lower()
    for place, coords in location_coords.items():
        if place in location_lower:
            return coords
            
    # Default to San Francisco coordinates if unknown
    return {'latitude': 37.7749, 'longitude': -122.4194}

def delete_tricoach_events(db):
    """Delete all existing TriCoach events from Firestore"""
    try:
        # Query for all TriCoach events
        events_ref = db.collection('events')
        tricoach_events = events_ref.where('source', '==', 'TriCoach').stream()
        
        # Delete in batches
        batch = db.batch()
        count = 0
        deleted = 0
        
        for doc in tricoach_events:
            batch.delete(doc.reference)
            count += 1
            deleted += 1
            
            if count >= 25:
                batch.commit()
                print(f"Deleted {deleted} TriCoach events")
                batch = db.batch()
                count = 0
        
        # Commit any remaining deletes
        if count > 0:
            batch.commit()
            deleted += count
        
        print(f"Total TriCoach events deleted: {deleted}")
        
    except Exception as e:
        print(f"Error deleting TriCoach events: {e}")

def parse_event_text(text):
    """Parse structured event text into components"""
    try:
        # Split on common delimiters
        parts = text.split('OPEN')  # Split on registration status
        if len(parts) >= 2:
            title_and_date = parts[0].strip()
            remaining = parts[1].strip()
            
            # Extract date - look for date pattern MM/DD/YYYY
            date_match = re.search(r'(\d{2}/\d{2}/\d{4})', title_and_date)
            date = date_match.group(1) if date_match else None
            
            # Clean up title by removing date and parenthetical notes
            title = title_and_date.replace(date, '').strip() if date else title_and_date
            title = re.sub(r'\s*\([^)]*\)', '', title)  # Remove text in parentheses
            title = title.strip()
            
            # Remove member discount info and other non-location text
            remaining = re.sub(r'\d+% Off.*$', '', remaining, flags=re.IGNORECASE)
            remaining = re.sub(r'Points\s+Rewards.*$', '', remaining, flags=re.IGNORECASE)
            remaining = re.sub(r'\(Draft Legal\)', '', remaining, flags=re.IGNORECASE)
            
            # Extract distances first and completely remove them from remaining text
    distances = []
            distance_keywords = {
                'Sprint': 'Sprint',
                'Olympic': 'Olympic',
                '70.3': '70.3',
                'Half': 'Half',
                'Full': 'Full',
                'Iron': 'Ironman',
                'International': 'Olympic',
                'Super Sprint': 'Super Sprint'
            }
            
            # First collect all distances
            for keyword, normalized in distance_keywords.items():
                if re.search(rf'\b{keyword}\b', remaining, re.IGNORECASE):
                    distances.append(normalized)
            
            # Then remove all distance keywords from the text
            for keyword in distance_keywords:
                remaining = re.sub(rf'\b{keyword}\b', '', remaining, flags=re.IGNORECASE)
            
            # Clean up location
            # Remove distance-related measurements
            remaining = re.sub(r'\d+\s*(?:yd|yard|m|mi|mile|k|km)s?\b', '', remaining, flags=re.IGNORECASE)
            remaining = re.sub(r'(?:swim|run|bike)[,\s]*', '', remaining, flags=re.IGNORECASE)
            remaining = re.sub(r'pool\s*', '', remaining, flags=re.IGNORECASE)
            
            # Remove any numbers that aren't part of an address
            remaining = re.sub(r'(?<!\d)\d+(?!\d)', '', remaining)
            
            # Clean up location text
            location_parts = []
            for part in remaining.split(','):
                part = part.strip()
                # Skip parts that are just partial words, empty, or known distance terms
                if (len(part) <= 2 or 
                    part.lower() in ['ing', 'yd', 'mi', 'km'] or 
                    any(d.lower() in part.lower() for d in distance_keywords)):
                    continue
                # Remove any leading/trailing periods or dots
                part = part.strip('.')
                if part:
                    location_parts.append(part)
            
            location = ', '.join(location_parts)
            
            # Clean up any double spaces or commas
            location = re.sub(r'\s+', ' ', location)
            location = location.strip('.')  # Remove trailing periods
            location = location.strip('+')  # Remove leading/trailing plus signs
            
            # Handle special cases for non-CA locations
            if 'Omaha, NE' in location:
                location = 'Omaha, NE'  # Don't append CA for out-of-state locations
            elif 'Lake San Antonio' in location:
                location = 'Lake San Antonio, CA'
            else:
                # Ensure proper CA format
                if not location.endswith(', CA'):
                    location = re.sub(r'[,\s]*CA\s*$', '', location)  # Remove any existing CA
                    location = location.rstrip(',').strip()  # Remove trailing commas
                    location = f"{location}, CA"
            
            # Final cleanup of any remaining artifacts
            location = re.sub(r',\s*,', ',', location)  # Remove double commas
            location = re.sub(r',\s*CA,\s*CA$', ', CA', location)  # Remove duplicate CA
            location = location.replace(',,', ',')  # Catch any remaining double commas
            
            return {
                'title': title,
                'date': date,
                'location': location,
                'distances': distances
            }
            
    except Exception as e:
        print(f"Error parsing event text: {e}")
        print(f"Original text: {text}")
    
    return None

def scrape_tricoach_events():
    """Scrape events from TriCoach Martin website."""
    events = []
    seen_titles = set()
    try:
        url = "https://www.tricoachmartin.com/nor-cal-triathlon-calendar"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find table rows or list items that might contain events
        event_elements = soup.find_all(['tr', 'li', 'div'])
        
        for element in event_elements:
            text = element.get_text().strip()
            
            # Skip headers, notes, empty text, and past events
            if (not text or 'cost is usually' in text.lower() or 
                'how to use' in text.lower() or '2024' in text):
                        continue
                        
            # Only process 2025 events
            if '2025' not in text:
                        continue
                    
            parsed = parse_event_text(text)
            if not parsed:
                            continue
                    
            # Skip if we've seen this event
            if parsed['title'] in seen_titles:
                        continue
            seen_titles.add(parsed['title'])
            
            event_data = {
                'id': f"tricoach_{abs(hash(parsed['title']))}",
                'title': parsed['title'],
                'date': parsed['date'],
                'location': {
                    'address': parsed['location'],
                    'state': 'CA',
                    'country': 'USA'
                },
                'distances': parsed['distances'],
                'type': 'tri',
                'source': 'TriCoach',
                'sourceUrl': url,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            }
            
            # Add coordinates
            location_coords = get_coordinates(event_data['location'])
            if location_coords:
                event_data['location']['coordinates'] = location_coords
            
            events.append(event_data)
            print(f"Added event: {event_data['title']} ({event_data['date']})")
        
        return events
        
    except Exception as e:
        print(f"Error scraping TriCoach events: {e}")
        return []

def save_events_to_firestore(events, db):
    """Save events to Firestore"""
    batch = db.batch()
    batch_count = 0
    saved_count = 0
    
    for event in events:
        try:
            doc_ref = db.collection('events').document(event['id'])
            batch.set(doc_ref, event)
            batch_count += 1
            
            if batch_count >= 25:
                batch.commit()
                saved_count += batch_count
                print(f"Saved {saved_count} events")
                batch = db.batch()
                batch_count = 0
                
        except Exception as e:
            print(f"Error saving event: {e}")
                        continue

    # Commit any remaining events
    if batch_count > 0:
        batch.commit()
        saved_count += batch_count
    
    print(f"Total events saved: {saved_count}")

def main():
    """Main function to scrape and save events"""
    try:
        # Initialize Firebase
        db = initialize_firebase()
        if not db:
            print("Failed to initialize Firebase")
            return
        
        # First delete existing TriCoach events
        print("Deleting existing TriCoach events...")
        delete_tricoach_events(db)
        
        # Get and save new events
        events = scrape_tricoach_events()
        print(f"Found {len(events)} events")
        
        if events:
            save_events_to_firestore(events, db)
        
    except Exception as e:
        print(f"Error in main: {e}")

if __name__ == "__main__":
    main() 