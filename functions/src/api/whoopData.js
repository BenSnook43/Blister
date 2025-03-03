const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { calculateAverages } = require("../analysis/whoopAnalysis");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.getWhoopAnalysis = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to view WHOOP data."
    );
  }

  try {
    // Get the target user's ID (either the requesting user or a specified user)
    const targetUserId = data.userId || context.auth.uid;

    // If requesting another user's data, check permissions
    if (targetUserId !== context.auth.uid) {
      // Here you can implement your permission logic
      // For now, we'll only allow users to view their own data
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only view your own WHOOP data."
      );
    }

    // Check if user has WHOOP connected
    const userTokensDoc = await db.collection("userTokens").doc(targetUserId).get();
    if (!userTokensDoc.exists || !userTokensDoc.data()?.whoop?.access_token) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "WHOOP is not connected for this user."
      );
    }

    // Get the user's WHOOP data
    const platformDataDoc = await db
      .collection("platformData")
      .doc(targetUserId)
      .get();

    if (!platformDataDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "No WHOOP data found for this user."
      );
    }

    const whoopData = platformDataDoc.data()?.whoop;
    if (!whoopData) {
      throw new functions.https.HttpsError(
        "not-found",
        "No WHOOP data found for this user."
      );
    }

    // Calculate analysis
    const analysis = calculateAverages(whoopData);

    return {
      analysis,
      lastSync: whoopData.lastSync
    };
  } catch (error) {
    console.error("Error fetching WHOOP analysis:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Error fetching WHOOP analysis."
    );
  }
}); 