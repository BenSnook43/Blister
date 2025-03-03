// src/utils/services.js
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import app from '../firebaseConfig';  // Correctly import the default export

const firestore = getFirestore(app);  // Use the app to get Firestore

export const fetchEvents = async () => {
  try {
    const eventsSnapshot = await getDocs(collection(firestore, 'events'));
    const eventsList = eventsSnapshot.docs.map(doc => doc.data());
    return eventsList;
  } catch (error) {
    console.error("Error fetching events from Firestore:", error);
    return [];
  }
};

export const saveEvents = async (events) => {
  try {
    const eventsRef = collection(firestore, 'events');
    let savedCount = 0;
    
    // Create a batch for bulk operations
    const batch = writeBatch(firestore);
    
    for (const event of events) {
      // Create a unique ID based on the event properties
      const eventId = `${event.title}_${event.date}_${event.location}`.replace(/[^a-zA-Z0-9]/g, '_');
      const eventRef = doc(eventsRef, eventId);
      
      // Set the document with merge: false to override any existing data
      batch.set(eventRef, {
        ...event,
        createdAt: new Date(),
        id: eventId
      }, { merge: false });
      savedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully saved ${savedCount} events!`);
    return { savedCount, duplicateCount: 0 };
    
  } catch (error) {
    console.error('Error saving events:', error);
    throw error;
  }
};