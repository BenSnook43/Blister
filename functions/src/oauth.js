const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({origin: true});

// For local development, load the .env file
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Debug log environment state
console.log("Environment Check:", {
  NODE_ENV: process.env.NODE_ENV,
  hasWahooId: !!process.env.WAHOO_CLIENT_ID,
  hasWahooSecret: !!process.env.WAHOO_CLIENT_SECRET,
  hasStravaId: !!process.env.STRAVA_CLIENT_ID,
  hasStravaSecret: !!process.env.STRAVA_CLIENT_SECRET,
  hasWhoopId: !!process.env.WHOOP_ID,
  hasWhoopSecret: !!process.env.WHOOP_SECRET,
});

// Define base URL for redirects
const REDIRECT_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://blister-app.web.app"
  : "http://localhost:5173";

// Platform configurations
const PLATFORM_CONFIGS = {
  strava: {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    tokenUrl: "https://www.strava.com/oauth/token",
    redirectUrl: `${REDIRECT_BASE_URL}/auth/strava/callback`,
  },
  whoop: {
    clientId: process.env.WHOOP_ID,
    clientSecret: process.env.WHOOP_SECRET,
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    redirectUrl: `${REDIRECT_BASE_URL}/auth/whoop/callback`,
  },
  wahoo: {
    clientId: process.env.WAHOO_CLIENT_ID,
    clientSecret: process.env.WAHOO_CLIENT_SECRET,
    tokenUrl: "https://api.wahooligan.com/oauth/token",
    redirectUrl: `${REDIRECT_BASE_URL}/auth/wahoo/callback`,
  },
};

// Validate platform configurations
Object.entries(PLATFORM_CONFIGS).forEach(([platform, config]) => {
  if (!config.clientId || !config.clientSecret) {
    console.warn(`Warning: Missing credentials for ${platform}:`, {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
    });
  }
});

exports.exchangeToken = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const {code, userId, platform, redirectUri} = req.body;

      // Debug log the incoming request
      console.log("Token Exchange Request:", {
        platform,
        hasCode: !!code,
        hasUserId: !!userId,
        redirectUri,
        availablePlatforms: Object.keys(PLATFORM_CONFIGS),
      });

      // Validate required parameters
      if (!code || !userId || !platform) {
        return res.status(400).json({
          error: "Missing required parameters"
        });
      }

      // Get platform config
      const platformConfig = PLATFORM_CONFIGS[platform.toLowerCase()];

      // Debug log platform configuration
      console.log("Platform Config Check:", {
        requestedPlatform: platform,
        normalizedPlatform: platform.toLowerCase(),
        hasConfig: !!platformConfig,
        configuredPlatforms: Object.keys(PLATFORM_CONFIGS),
        credentials: platformConfig ? {
          hasClientId: !!platformConfig.clientId,
          hasClientSecret: !!platformConfig.clientSecret,
        } : null,
      });

      if (!platformConfig) {
        return res.status(400).json({
          error: `Unsupported platform: ${platform}`
        });
      }

      // Prepare headers and body
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      // Exchange authorization code for access token
      const tokenResponse = await fetch(platformConfig.tokenUrl, {
        method: "POST",
        headers,
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: platformConfig.clientId,
          client_secret: platformConfig.clientSecret
        }).toString(),
      });

      // Log the response for debugging
      const responseText = await tokenResponse.text();
      console.log('Token exchange response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        body: responseText
      });

      if (!tokenResponse.ok) {
        return res.status(400).json({
          error: `Failed to exchange token: ${responseText}`
        });
      }

      const tokenData = JSON.parse(responseText);

      // Store the token in Firestore
      const userTokensRef = admin.firestore().doc(`userTokens/${userId}`);
      await userTokensRef.set({
        [platform.toLowerCase()]: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          updated_at: new Date().toISOString()
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      // Return success response
      return res.json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      });
    } catch (error) {
      console.error("Error in token exchange:", error);
      return res.status(500).json({error: error.message});
    }
  });
}); 