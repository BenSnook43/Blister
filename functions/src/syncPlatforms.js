// syncPlatforms.js

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Set up CORS handler for HTTP endpoints
const corsHandler = cors({
  origin: true, // Adjust for your production domain as needed
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  maxAge: 86400 // 24 hours
});

// ----------------------------
// WHOOP Client Class
// ----------------------------
class WhoopClient {
  constructor(userId) {
    this.userId = userId;
    // Base API and OAuth endpoints per WHOOP documentation:
    this.baseUrl = 'https://api.prod.whoop.com';
    this.authUrl = 'https://api.prod.whoop.com/oauth/oauth2';
    this.db = admin.firestore();
    // Use environment variables for credentials.
    this.clientId = process.env.WHOOP_ID;
    this.clientSecret = process.env.WHOOP_SECRET;
    // Use one of your registered Redirect URLs (must match exactly)
    this.redirectUri = 'https://blister.dev/auth/whoop/callback';
    // A property to hold an in-progress refresh promise.
    this.refreshingTokenPromise = null;
  }

  // exchangeToken: Exchanges an authorization code for tokens.
  async exchangeToken(authCode) {
    console.log('[WHOOP] Exchanging auth code for token');
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', authCode);
    formData.append('redirect_uri', this.redirectUri);
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);

    const response = await fetch(`${this.authUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WHOOP] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[WHOOP] Token exchange successful');
    // Save tokens in Firestore under userTokens collection.
    await this.db.collection('userTokens').doc(this.userId).set({
      whoop: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        expires_in: data.expires_in,
        token_type: data.token_type,
        scope: data.scope,
        updated_at: new Date().toISOString()
      }
    }, { merge: true });
    return data;
  }

  // getAccessToken: Retrieves the current access token (refreshing if needed).
  async getAccessToken() {
    console.log(`[WHOOP] Getting access token for user ${this.userId}`);
    const tokenDoc = await this.db.collection('userTokens').doc(this.userId).get();
    if (!tokenDoc.exists || !tokenDoc.data().whoop) {
      throw new Error("No WHOOP tokens found for this user.");
    }
    const tokens = tokenDoc.data().whoop;
    console.log('[WHOOP] Token data:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: tokens.expires_at,
      now: new Date().toISOString()
    });
    
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    // If token expires in less than 5 minutes, refresh it.
    if (expiresAt.getTime() - now.getTime() < 300000) { // 5 minutes in ms
      console.log('[WHOOP] Token expired or expiring soon, refreshing...');
      // Use a lock so that only one refresh is performed per instance.
      if (!this.refreshingTokenPromise) {
        this.refreshingTokenPromise = this.refreshToken(tokens.refresh_token)
          .then(newToken => {
            this.refreshingTokenPromise = null;
            return newToken;
          })
          .catch(err => {
            this.refreshingTokenPromise = null;
            throw err;
          });
      }
      return this.refreshingTokenPromise;
    }
    return tokens.access_token;
  }

  // refreshToken: Refreshes the access token using the refresh token.
  async refreshToken(refreshToken) {
    console.log('[WHOOP] Attempting to refresh token');
    const tokenUrl = `${this.authUrl}/token`;
    // Build the refresh payload.
    const refreshParams = {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      scope: 'offline'
    };

    // If your WHOOP client configuration requires a redirect_uri even for refresh,
    // uncomment the next line (and verify your settings in the WHOOP Developer Dashboard).
    // refreshParams.redirect_uri = this.redirectUri;

    const body = new URLSearchParams(refreshParams);
    console.log('[WHOOP] Refresh token request body:', body.toString());

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString()
    });

    console.log('[WHOOP] Refresh token response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WHOOP] Token refresh failed:', errorText);
      throw new Error(`WHOOP token refresh failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[WHOOP] Token refresh successful');
    // Update tokens in Firestore.
    await this.db.collection('userTokens').doc(this.userId).update({
      'whoop.access_token': data.access_token,
      'whoop.refresh_token': data.refresh_token,
      'whoop.expires_in': data.expires_in,
      'whoop.token_type': data.token_type,
      'whoop.scope': data.scope,
      'whoop.expires_at': new Date(Date.now() + data.expires_in * 1000).toISOString(),
      'whoop.updated_at': new Date().toISOString()
    });
    return data.access_token;
  }

  // makeApiRequest: Makes an API request to a WHOOP endpoint.
  // An optional overrideToken parameter allows using a token already retrieved.
  async makeApiRequest(endpoint, method = 'GET', bodyData = null, overrideToken = null) {
    const accessToken = overrideToken || await this.getAccessToken();
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    console.log('[WHOOP] Making API request:', { url, method });
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    if (bodyData) {
      options.body = JSON.stringify(bodyData);
    }
    const response = await fetch(url, options);
    const responseText = await response.text();
    console.log('[WHOOP] API Response:', {
      status: response.status,
      body: responseText
    });
    if (!response.ok) {
      throw new Error(`WHOOP API error: ${response.status} - ${responseText}`);
    }
    return JSON.parse(responseText);
  }

  // API helper methods that simply call makeApiRequest without an override token.
  async getProfile() {
    return this.makeApiRequest('/user/profile');
  }
  async getRecovery(startDate) {
    const formattedDate = startDate.toISOString().split('T')[0];
    return this.makeApiRequest(`/recovery?start=${formattedDate}`);
  }
  async getWorkouts(startDate) {
    const formattedDate = startDate.toISOString().split('T')[0];
    return this.makeApiRequest(`/workout?start=${formattedDate}`);
  }
  async getSleep(startDate) {
    const formattedDate = startDate.toISOString().split('T')[0];
    return this.makeApiRequest(`/sleep?start=${formattedDate}`);
  }
}

// ----------------------------
// Scheduled Function: syncPlatformData
// ----------------------------
// This function runs every 2 hours and iterates over all users that have connected platforms.
exports.syncPlatformData = onSchedule("every 2 hours", async (event) => {
  try {
    console.log('[SYNC] Starting scheduled platform sync');
    const userTokensSnapshot = await db.collection('userTokens').get();
    if (userTokensSnapshot.empty) {
      console.log("No users with connected platforms found.");
      return;
    }

    for (const doc of userTokensSnapshot.docs) {
      const userId = doc.id;
      const tokens = doc.data();
      const platformDataRef = db.collection('platformData').doc(userId);
      const platformDataDoc = await platformDataRef.get();
      let platformData = platformDataDoc.exists ? platformDataDoc.data() : {};
      platformData.lastSync = new Date().toISOString();
      platformData.platforms = platformData.platforms || {};

      // Sync WHOOP data if available.
      if (tokens.whoop && tokens.whoop.access_token) {
        try {
          console.log(`[SYNC] Syncing WHOOP data for user ${userId}`);
          const whoopClient = new WhoopClient(userId);
          // Use data from the last 30 days.
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);

          // **Fetch the access token once before making API calls**
          const accessToken = await whoopClient.getAccessToken();

          // Use the same token for all API calls.
          const [profile, recovery, workouts, sleep] = await Promise.all([
            whoopClient.makeApiRequest('/user/profile', 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/recovery?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/workout?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/sleep?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken)
          ]);

          platformData.platforms.whoop = {
            profile,
            recovery,
            workouts,
            sleep
          };
          console.log(`[SYNC] WHOOP data synced for user ${userId}`);
        } catch (err) {
          console.error(`[SYNC] Error syncing WHOOP for user ${userId}:`, err);
          platformData.platforms.whoop = { error: err.message };
        }
      }

      // (Optionally add sync for other platforms, e.g., Strava, here.)

      // Update platformData in Firestore.
      await platformDataRef.set(platformData, { merge: true });
      console.log(`[SYNC] Successfully updated platform data for user ${userId}`);
    }
  } catch (error) {
    console.error("Error in syncPlatformData function:", error);
    throw error;
  }
});

// ----------------------------
// HTTP Trigger Function: triggerSync
// ----------------------------
// This function allows a manual sync to be triggered via an HTTP POST request.
exports.triggerSync = onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Handle CORS preflight.
      if (req.method === 'OPTIONS') {
        res.set({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
          "Access-Control-Max-Age": "86400"
        });
        return res.status(204).send('');
      }

      // Only allow POST requests.
      if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // Verify the Firebase ID token from the Authorization header.
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      console.log(`[SYNC] Manual sync triggered for user ${userId}`);

      // Retrieve the user's tokens.
      const tokenDoc = await db.collection('userTokens').doc(userId).get();
      if (!tokenDoc.exists) {
        return res.status(400).json({ error: "No connected platforms found." });
      }
      const tokens = tokenDoc.data();

      // Retrieve or initialize the platformData document.
      const platformDataRef = db.collection('platformData').doc(userId);
      let platformData = {};
      const platformDataDoc = await platformDataRef.get();
      if (platformDataDoc.exists) {
        platformData = platformDataDoc.data();
      }
      platformData.lastSync = new Date().toISOString();
      platformData.platforms = platformData.platforms || {};

      // Sync WHOOP data if connected.
      if (tokens.whoop && tokens.whoop.access_token) {
        try {
          const whoopClient = new WhoopClient(userId);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          // Fetch the access token once.
          const accessToken = await whoopClient.getAccessToken();
          const [profile, recovery, workouts, sleep] = await Promise.all([
            whoopClient.makeApiRequest('/user/profile', 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/recovery?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/workout?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken),
            whoopClient.makeApiRequest(`/sleep?start=${startDate.toISOString().split('T')[0]}`, 'GET', null, accessToken)
          ]);
          platformData.platforms.whoop = {
            profile,
            recovery,
            workouts,
            sleep
          };
          console.log(`[SYNC] WHOOP data manually synced for user ${userId}`);
        } catch (err) {
          console.error(`[SYNC] Error manually syncing WHOOP for user ${userId}:`, err);
          platformData.platforms.whoop = { error: err.message };
        }
      }

      // (Optionally add manual sync for other platforms here.)

      // Save the updated platformData.
      await platformDataRef.set(platformData, { merge: true });
      return res.status(200).json({
        success: true,
        message: "Sync completed.",
        lastSync: platformData.lastSync,
        data: platformData.platforms
      });
    } catch (error) {
      console.error("Error in triggerSync:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });
});
