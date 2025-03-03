import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Function to store or update a user's token for a specific platform
export async function storeUserToken(userId, platform, token) {
  try {
    const userTokensRef = doc(db, 'userTokens', userId);
    const userTokensDoc = await getDoc(userTokensRef);

    if (userTokensDoc.exists()) {
      // Update existing document
      await updateDoc(userTokensRef, {
        [platform]: token,
        lastUpdated: new Date()
      });
    } else {
      // Create new document
      await setDoc(userTokensRef, {
        [platform]: token,
        lastUpdated: new Date(),
        userId
      });
    }

    console.log(`Token for ${platform} stored successfully for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error storing token for ${platform}:`, error);
    return false;
  }
}

// Function to retrieve a user's token for a specific platform
export async function getUserToken(userId, platform) {
  try {
    const userTokensRef = doc(db, 'userTokens', userId);
    const userTokensDoc = await getDoc(userTokensRef);

    if (userTokensDoc.exists()) {
      const data = userTokensDoc.data();
      return data[platform] || null;
    } else {
      console.warn(`No tokens found for user ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving token for ${platform}:`, error);
    return null;
  }
} 