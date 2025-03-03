import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime
import requests

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

MAPBOX_TOKEN = 'pk.eyJ1IjoiYmVuc25vb2sxIiwiYSI6ImNtNjY1YzFvZjIzZnAycG9kZXdueDRncmwifQ.qE9qP7n6my4joZwA_XS6tw'

def geocode_location(location):
    """Geocode a location string using Mapbox API."""
    try:
        # Add ", CA" if not present to focus on California locations
        if not any(suffix in location.lower() for suffix in [', ca', ',ca', ' ca']):
            location = f"{location}, CA"

        # Encode location for URL
        encoded_location = requests.utils.quote(location)
        
        # Make request to Mapbox
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded_location}.json"
        params = {
            'access_token': MAPBOX_TOKEN,
            'country': 'US',
            'types': 'place,address',
            'limit': 1,
            'bbox': [-124.482003, 32.528832, -114.131211, 42.009517]  # California bounding box
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get('features') and len(data['features']) > 0:
            coordinates = data['features'][0]['center']
            return coordinates[1], coordinates[0]  # Return as lat, lng
            
        print(f"Warning: Could not geocode location: {location}")
        return None, None
        
    except Exception as e:
        print(f"Error geocoding {location}: {str(e)}")
        return None, None

def determine_event_type(title, distance):
    """Determine event type based on title and distance."""
    text = (str(title) + ' ' + str(distance)).lower()
    
    if any(word in text for word in ['50k', '50m', '100k', '100m', 'ultra']):
        return 'ultra'
    elif any(word in text for word in ['trail', 'mountain', 'hills', 'wilderness', 'forest']):
        return 'trail'
    else:
        return 'trail'  # Default to trail for UltraSignUp events

def parse_excel_and_create_events():
    """Parse UltraSignUp Excel file and create events in Firestore."""
    try:
        # Read Excel file
        df = pd.read_excel('UltraSignUp.xlsx')
        
        # Process each row
        for _, row in df.iterrows():
            try:
                # Extract and format date
                date_str = str(row['Date'])
                try:
                    # Try parsing with pandas first
                    date_obj = pd.to_datetime(date_str)
                    formatted_date = date_obj.strftime('%Y-%m-%d')
                except:
                    print(f"Error parsing date: {date_str}")
                    continue

                # Format location and get coordinates
                location = f"{row['City']}, {row['State']}"
                lat, lng = geocode_location(location)
                
                if lat is None or lng is None:
                    print(f"Skipping event due to invalid coordinates: {row['Event Name']}")
                    continue

                # Create event data
                event_data = {
                    'title': str(row['Event Name']),
                    'date': formatted_date,
                    'location': f"{row['City']}, {row['State']}",
                    'type': determine_event_type(row['Event Name'], row.get('Distances', '')),
                    'latitude': lat,
                    'longitude': lng,
                    'sourceUrl': str(row['sourceUrl']) if pd.notna(row['sourceUrl']) else '',
                    'createdAt': firestore.SERVER_TIMESTAMP
                }

                # Add optional fields if they exist
                if 'Distances' in row and pd.notna(row['Distances']):
                    event_data['distance'] = str(row['Distances'])
                if 'Time' in row:
                    event_data['time'] = str(row['Time'])

                # Add to Firestore
                db.collection('events').add(event_data)
                print(f"Created event: {event_data['title']}")

            except Exception as e:
                print(f"Error processing row: {str(e)}")
                continue

    except Exception as e:
        print(f"Error reading Excel file: {str(e)}")

if __name__ == "__main__":
    parse_excel_and_create_events() 