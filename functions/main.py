import functions_framework
from flask import jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore, auth
import requests
from datetime import datetime, timedelta
import os
import logging
import sys
import traceback  # Add this import at the top

# Initialize Firebase Admin
if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()

# Add these constants at the top of the file
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_BASE_URL = "https://api.prod.whoop.com"
WHOOP_REDIRECT_URI = "https://localhost:5173/auth/whoop/callback"  # Update for production
WHOOP_CLIENT_ID = os.environ.get("WHOOP_ID")
WHOOP_CLIENT_SECRET = os.environ.get("WHOOP_SECRET")

# Configure logging
logging.basicConfig(
    stream=sys.stdout,  # Log to stdout for Cloud Functions
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

@functions_framework.http
def trigger_sync(request):
    # Set CORS headers for all responses
    headers = {
        'Access-Control-Allow-Origin': 'https://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '3600'
    }
    
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        logger.info('Handling CORS preflight request')
        return ('', 204, headers)

    try:
        # Add more detailed logging
        logger.info(f'Request method: {request.method}')
        logger.info(f'Request headers: {dict(request.headers)}')
        
        # Verify Firebase Auth token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            logger.error('No Bearer token found')
            return jsonify({'error': 'No token provided'}), 401, headers

        id_token = auth_header.split('Bearer ')[1]
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token['uid']
            logger.info(f'Successfully authenticated user: {user_id}')
        except Exception as e:
            logger.error(f'Token verification failed: {str(e)}')
            return jsonify({'error': 'Invalid token'}), 401, headers

        # Get user's WHOOP tokens
        logger.info(f'Fetching tokens for user {user_id}')
        user_doc = db.collection('userTokens').document(user_id).get()
        
        if not user_doc.exists:
            logger.error(f'No tokens found for user {user_id}')
            return jsonify({'error': 'No connected platforms'}), 404, headers

        tokens = user_doc.to_dict()
        logger.info(f'User tokens retrieved: {tokens.keys()}')

        if not tokens.get('whoop'):
            logger.error('No WHOOP tokens found')
            return jsonify({'error': 'WHOOP not connected'}), 404, headers

        # Sync WHOOP data
        logger.info('Starting WHOOP sync')
        whoop_data = sync_whoop_data(user_id, tokens['whoop'])
        logger.info(f'Sync completed with data: {whoop_data}')

        return jsonify({
            'status': 'success',
            'data': whoop_data
        }), 200, headers

    except Exception as e:
        logger.error(f'Error in trigger_sync: {str(e)}')
        logger.error(f'Traceback: {traceback.format_exc()}')
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500, headers

def refresh_whoop_token(refresh_token):
    logger.info('Attempting to refresh WHOOP token')
    try:
        refresh_data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': WHOOP_CLIENT_ID,
        }
        
        safe_data = {k: v for k, v in refresh_data.items() if k not in ['client_secret', 'refresh_token']}
        logger.info(f'Refresh data (excluding secrets): {safe_data}')
        
        headers = {
            'Authorization': f'Basic {WHOOP_CLIENT_SECRET}'
        }
        
        response = requests.post(WHOOP_TOKEN_URL, data=refresh_data, headers=headers)
        logger.info(f'Refresh token response status: {response.status_code}')
        
        if response.ok:
            return response.json()
        else:
            logger.error(f'Token refresh failed: {response.status_code} - {response.text}')
            return None
    except Exception as e:
        logger.error(f'Error refreshing token: {str(e)}')
        return None

def sync_whoop_data(user_id, tokens):
    try:
        logger.info(f'Starting WHOOP sync for user {user_id}')
        
        # First, try to refresh the token
        if 'refresh_token' in tokens:
            new_tokens = refresh_whoop_token(tokens['refresh_token'])
            if new_tokens:
                tokens = new_tokens
                # Update tokens in Firestore
                db.collection('userTokens').document(user_id).set({
                    'whoop': new_tokens
                }, merge=True)
                logger.info('Successfully refreshed and updated WHOOP token')
            else:
                logger.error('Failed to refresh WHOOP token')
                return {
                    'status': 'error',
                    'error': 'Token refresh failed',
                    'timestamp': datetime.now().isoformat()
                }
        
        now = datetime.now()
        start_date = now - timedelta(days=30)

        platform_data = {
            'lastSync': now.isoformat(),
            'status': 'pending',
            'data': {}
        }

        headers = {
            'Authorization': f'Bearer {tokens["access_token"]}',
            'Content-Type': 'application/json'
        }

        logger.info('Using headers:', {
            'hasAuth': 'Authorization' in headers,
            'authPrefix': headers['Authorization'][:10] + '...' if 'Authorization' in headers else None
        })

        # Fetch user profile
        logger.info('Fetching WHOOP profile...')
        profile_url = f"{WHOOP_BASE_URL}/api/v1/user/profile"
        profile_response = requests.get(profile_url, headers=headers)
        logger.info(f'Profile response status: {profile_response.status_code}')
        logger.info(f'Profile URL: {profile_url}')
        
        if profile_response.ok:
            platform_data['data']['profile'] = profile_response.json()
        else:
            logger.error(f'Profile fetch failed: {profile_response.status_code}')
            logger.error(f'Response headers: {dict(profile_response.headers)}')
            logger.error(f'Response body: {profile_response.text}')

        # Fetch recovery data
        logger.info('Fetching WHOOP recovery data...')
        recovery_url = f"{WHOOP_BASE_URL}/api/v1/cycles"
        params = {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': now.strftime('%Y-%m-%d')
        }
        recovery_response = requests.get(recovery_url, headers=headers, params=params)
        logger.info(f'Recovery URL: {recovery_url}')
        logger.info(f'Recovery params: {params}')
        
        if recovery_response.ok:
            platform_data['data']['recovery'] = recovery_response.json()
        else:
            logger.error(f'Recovery fetch failed: {recovery_response.status_code}')
            logger.error(f'Response headers: {dict(recovery_response.headers)}')
            logger.error(f'Response body: {recovery_response.text}')

        platform_data['status'] = 'success'

        # Save to Firestore
        logger.info('Saving data to Firestore...')
        db.collection('platformData').document(user_id).set({
            'whoop': platform_data,
            'lastUpdated': now.isoformat()
        }, merge=True)
        logger.info('Data saved successfully')

        return platform_data

    except Exception as e:
        logger.error(f'Error syncing WHOOP data: {str(e)}')
        logger.error(f'Traceback: {traceback.format_exc()}')
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@functions_framework.http
def test(request):
    logger.info("Test endpoint called")
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'env_vars': {
            'has_whoop_id': bool(WHOOP_CLIENT_ID),
            'has_whoop_secret': bool(WHOOP_CLIENT_SECRET)
        }
    }) 