import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { DEFAULT_PRIVACY_SETTINGS } from './privacyDefaults';

export async function createUserDocument(user) {
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('Creating new user document for:', user.uid);
      const displayName = user.displayName || user.email.split('@')[0];
      const userData = {
        userId: user.uid,
        email: user.email,
        displayName: displayName,
        profileImage: user.photoURL || null,
        location: '',
        totalRaces: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
        searchableTerms: [
          displayName.toLowerCase(),
          user.email.toLowerCase(),
          user.email.split('@')[0].toLowerCase()
        ]
      };

      // Create user document
      await setDoc(userRef, userData);

      // Initialize privacy settings
      const privacyRef = doc(db, 'userPrivacy', user.uid);
      await setDoc(privacyRef, {
        ...DEFAULT_PRIVACY_SETTINGS,
        lastUpdated: new Date(),
        userId: user.uid
      });

      console.log('User document and privacy settings created successfully');
      return userData;
    } else {
      const existingData = userDoc.data();
      // Update searchable terms if they don't exist
      if (!existingData.searchableTerms) {
        const displayName = existingData.displayName || user.email.split('@')[0];
        const updatedData = {
          ...existingData,
          searchableTerms: [
            displayName.toLowerCase(),
            user.email.toLowerCase(),
            user.email.split('@')[0].toLowerCase()
          ]
        };
        await setDoc(userRef, updatedData, { merge: true });
        return updatedData;
      }
      console.log('User document already exists');
      return existingData;
    }
  } catch (error) {
    console.error('Error creating/checking user document:', error);
    throw error;
  }
} 