import requests
import firebase_admin
from firebase_admin import auth
import json

# Initialize Firebase Admin (if not already initialized)
if not firebase_admin._apps:
    firebase_admin.initialize_app()

def test_trigger_sync():
    # Replace with a real user ID from your Firebase Auth
    TEST_USER_ID = '6T4hV7wsxfhVYbpPNMQIyJ87ZEC3'
    
    # Get a custom token for the test user
    custom_token = auth.create_custom_token(TEST_USER_ID)
    
    # Local function URL
    url = 'http://localhost:8080'
    
    # Headers with auth token
    headers = {
        'Authorization': f'Bearer {custom_token.decode()}',
        'Content-Type': 'application/json'
    }
    
    # Make the request
    response = requests.post(url, headers=headers)
    
    print(f'Status Code: {response.status_code}')
    print(f'Response: {json.dumps(response.json(), indent=2)}')

if __name__ == '__main__':
    test_trigger_sync() 