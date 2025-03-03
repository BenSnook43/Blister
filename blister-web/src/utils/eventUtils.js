import { db } from '../firebase';
import { doc as firestoreDoc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';

// Add an event to user's upcoming events
export async function addUpcomingEvent(userId, event) {
  try {
    const upcomingEventRef = firestoreDoc(db, 'userUpcomingEvents', `${userId}_${event.id}`);
    await setDoc(upcomingEventRef, {
      userId,
      eventId: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      type: event.type,
      distance: event.distance,
      addedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error adding upcoming event:', error);
    throw error;
  }
}

// Remove an event from user's upcoming events
export async function removeUpcomingEvent(userId, eventId) {
  try {
    const upcomingEventRef = firestoreDoc(db, 'userUpcomingEvents', `${userId}_${eventId}`);
    await deleteDoc(upcomingEventRef);
    return true;
  } catch (error) {
    console.error('Error removing upcoming event:', error);
    throw error;
  }
}

// Get all upcoming events for a user
export const getUpcomingEvents = async (userId) => {
  try {
    console.log('Getting upcoming events for user:', userId);
    
    // Get user's registered events
    const userEventsRef = collection(db, 'userUpcomingEvents');
    const userEventsQuery = query(userEventsRef, where('userId', '==', userId));
    console.log('Querying user events...');
    
    const userEventsSnapshot = await getDocs(userEventsQuery);
    console.log('User events found:', userEventsSnapshot.docs.length);

    // Use the data directly from userUpcomingEvents
    const events = userEventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Add any computed fields here
      weeksUntil: Math.ceil((new Date(doc.data().date) - new Date()) / (1000 * 60 * 60 * 24 * 7))
    }));

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Processed events:', events);
    return events;
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    throw error;
  }
};

// Check if an event is in user's upcoming events
export async function isEventUpcoming(userId, eventId) {
  try {
    const upcomingEventRef = firestoreDoc(db, 'userUpcomingEvents', `${userId}_${eventId}`);
    const docSnap = await getDoc(upcomingEventRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking upcoming event:', error);
    throw error;
  }
} 