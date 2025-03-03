import os
import json
import requests
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import firestore, auth
from flask import Flask, request, jsonify

# Initialize Firebase Admin if not already initialized.
if not firebase_admin._apps:
    firebase_admin.initialize_app()
db = firestore.client()

# WHOOP API endpoints and settings.
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_BASE_URL = "https://api.prod.whoop.com"
WHOOP_REDIRECT_URI = "https://localhost:5173/auth/whoop/callback"  # Must match your WHOOP developer dashboard.
WHOOP_CLIENT_ID = os.environ.get("WHOOP_ID")
WHOOP_CLIENT_SECRET = os.environ.get("WHOOP_SECRET")

# Create Flask app.
app = Flask(__name__)

# ----------------------------
# WhoopClient Class
# ----------------------------
class WhoopClient:
    def __init__(self, user_id):
        self.user_id = user_id
        self.db = db
        self.client_id = WHOOP_CLIENT_ID
        self.client_secret = WHOOP_CLIENT_SECRET
        self.redirect_uri = WHOOP_REDIRECT_URI

    def exchange_token(self, auth_code):
        """
        Exchange an authorization code for access and refresh tokens.
        (Typically used once during the OAuth flow.)
        """
        payload = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(WHOOP_TOKEN_URL, data=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.status_code} - {response.text}")
        data = response.json()
        # Save tokens to Firestore in the userTokens collection.
        self.db.collection("userTokens").document(self.user_id).set({
            "whoop": {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in"),
                "expires_at": (datetime.utcnow() + timedelta(seconds=data.get("expires_in"))).isoformat() + "Z",
                "token_type": data.get("token_type"),
                "scope": data.get("scope"),
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
        }, merge=True)
        return data

    def refresh_token(self, refresh_token):
        """
        Refresh the access token using the provided refresh token.
        Note: WHOOP’s sample payload for token refresh does NOT include redirect_uri.
        """
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "scope": "offline"
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        response = requests.post(WHOOP_TOKEN_URL, data=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Token refresh failed: {response.status_code} - {response.text}")
        data = response.json()
        # Update tokens in Firestore.
        self.db.collection("userTokens").document(self.user_id).update({
            "whoop.access_token": data.get("access_token"),
            "whoop.refresh_token": data.get("refresh_token"),
            "whoop.expires_in": data.get("expires_in"),
            "whoop.token_type": data.get("token_type"),
            "whoop.scope": data.get("scope"),
            "whoop.expires_at": (datetime.utcnow() + timedelta(seconds=data.get("expires_in"))).isoformat() + "Z",
            "whoop.updated_at": datetime.utcnow().isoformat() + "Z"
        })
        return data.get("access_token")

    def get_access_token(self):
        """
        Retrieve the current access token from Firestore.
        If the token expires in less than 5 minutes, refresh it.
        """
        doc = self.db.collection("userTokens").document(self.user_id).get()
        if not doc.exists:
            raise Exception("No tokens found for user")
        tokens = doc.to_dict().get("whoop")
        if not tokens:
            raise Exception("No WHOOP tokens found for user")
        expires_at_str = tokens.get("expires_at")
        # Parse the ISO timestamp (e.g., "2025-02-09T23:59:15.438Z")
        expires_at = datetime.strptime(expires_at_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        now = datetime.utcnow()
        if (expires_at - now).total_seconds() < 300:
            # Token expires in less than 5 minutes; refresh it.
            return self.refresh_token(tokens.get("refresh_token"))
        return tokens.get("access_token")

    def make_api_request(self, endpoint, method="GET", payload=None, token=None):
        """
        Make an authenticated request to a WHOOP API endpoint.
        """
        if token is None:
            token = self.get_access_token()
        url = f"{WHOOP_BASE_URL}/api/v1{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=payload)
        else:
            raise Exception("Unsupported HTTP method")
        if response.status_code != 200:
            raise Exception(f"WHOOP API error: {response.status_code} - {response.text}")
        return response.json()

    def get_profile(self):
        return self.make_api_request("/user/profile")

    def get_recovery(self, start_date):
        date_str = start_date.strftime("%Y-%m-%d")
        return self.make_api_request(f"/recovery?start={date_str}")

    def get_workouts(self, start_date):
        date_str = start_date.strftime("%Y-%m-%d")
        return self.make_api_request(f"/workout?start={date_str}")

    def get_sleep(self, start_date):
        date_str = start_date.strftime("%Y-%m-%d")
        return self.make_api_request(f"/sleep?start={date_str}")


# ----------------------------
# Data Sync Functions
# ----------------------------

def sync_whoop_data_for_user(user_id):
    """
    For a given user, create a WhoopClient and retrieve WHOOP data,
    then save it in the Firestore "platformData" collection.
    """
    print(f"Syncing WHOOP data for user: {user_id}")
    client = WhoopClient(user_id)
    start_date = datetime.utcnow() - timedelta(days=30)  # Last 30 days.
    try:
        profile = client.get_profile()
        recovery = client.get_recovery(start_date)
        workouts = client.get_workouts(start_date)
        sleep = client.get_sleep(start_date)
        data = {
            "lastSync": datetime.utcnow().isoformat() + "Z",
            "platforms": {
                "whoop": {
                    "profile": profile,
                    "recovery": recovery,
                    "workouts": workouts,
                    "sleep": sleep
                }
            }
        }
        db.collection("platformData").document(user_id).set(data, merge=True)
        return {"user_id": user_id, "status": "success"}
    except Exception as e:
        print(f"Error syncing WHOOP for user {user_id}: {e}")
        db.collection("platformData").document(user_id).set({
            "platforms": {
                "whoop": {
                    "error": str(e)
                }
            },
            "lastSync": datetime.utcnow().isoformat() + "Z"
        }, merge=True)
        return {"user_id": user_id, "status": "error", "message": str(e)}

def sync_platform_data():
    """
    Iterate over all documents in the "userTokens" collection.
    For each user with a WHOOP token, sync their WHOOP data.
    """
    results = []
    users = db.collection("userTokens").stream()
    for doc in users:
        user_id = doc.id
        tokens = doc.to_dict()
        if "whoop" in tokens:
            result = sync_whoop_data_for_user(user_id)
            results.append(result)
    return results

# ----------------------------
# HTTP Endpoints
# ----------------------------

@app.route("/sync_platform_data", methods=["GET"])
def scheduled_sync():
    """
    This endpoint is intended to be triggered on a schedule (for example,
    via Cloud Scheduler). It syncs data for all users.
    """
    try:
        results = sync_platform_data()
        return jsonify({"status": "success", "results": results}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/trigger_sync", methods=["GET"])
def trigger_sync():
    """
    A manual trigger for testing purposes.
    Optionally pass a query parameter 'user_id' to sync a specific user.
    If not provided, syncs all users.
    """
    user_id = request.args.get("user_id")
    try:
        if user_id:
            result = sync_whoop_data_for_user(user_id)
            return jsonify({"status": "success", "result": result}), 200
        else:
            results = sync_platform_data()
            return jsonify({"status": "success", "results": results}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ----------------------------
# For local testing only.
# ----------------------------
if __name__ == "__main__":
    app.run(debug=True)
