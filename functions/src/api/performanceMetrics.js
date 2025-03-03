const functions = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors");
const { computePerformanceMetrics } = require("../analysis/performanceMetrics");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.getPerformanceMetrics = onRequest((req, res) => {
  // Enable CORS with specific options
  const corsHandler = cors({
    origin: ['https://blister.dev', 'https://localhost:5173', 'http://localhost:5173'],
    credentials: true,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  return corsHandler(req, res, async () => {
    try {
      // Handle preflight request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', req.headers.origin);
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '86400');
        res.status(204).send('');
        return;
      }

      // Only allow POST requests
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // Verify Firebase ID token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get the user's platform data
      const platformDataDoc = await db
        .collection("platformData")
        .doc(userId)
        .get();

      if (!platformDataDoc.exists) {
        return res.status(200).json({
          metrics: null,
          message: "No platform data found"
        });
      }

      const platformData = platformDataDoc.data();
      
      // Check if we have any platform data to analyze
      if (!platformData || Object.keys(platformData).length === 0) {
        return res.status(200).json({
          metrics: null,
          message: "No platform data available"
        });
      }

      // Calculate metrics
      const metrics = computePerformanceMetrics(platformData);

      return res.status(200).json({
        metrics,
        lastSync: platformData.lastSync || null
      });

    } catch (error) {
      console.error("Error calculating performance metrics:", error);
      return res.status(500).json({
        error: "Internal server error during metrics calculation",
        message: error.message
      });
    }
  });
}); 