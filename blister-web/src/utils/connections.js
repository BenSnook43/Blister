import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';

export async function followUser(currentUserId, targetUserId) {
  try {
    // Get or create connections documents for both users
    const currentUserConnectionsRef = doc(db, 'userConnections', currentUserId);
    const targetUserConnectionsRef = doc(db, 'userConnections', targetUserId);

    // Check if documents exist
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(currentUserConnectionsRef),
      getDoc(targetUserConnectionsRef)
    ]);

    // Create documents if they don't exist
    if (!currentUserDoc.exists()) {
      await setDoc(currentUserConnectionsRef, {
        userId: currentUserId,
        following: [],
        followers: [],
        lastUpdated: new Date()
      });
    }

    if (!targetUserDoc.exists()) {
      await setDoc(targetUserConnectionsRef, {
        userId: targetUserId,
        following: [],
        followers: [],
        lastUpdated: new Date()
      });
    }

    // Update both documents atomically
    await Promise.all([
      updateDoc(currentUserConnectionsRef, {
        following: arrayUnion(targetUserId),
        lastUpdated: new Date()
      }),
      updateDoc(targetUserConnectionsRef, {
        followers: arrayUnion(currentUserId),
        lastUpdated: new Date()
      })
    ]);

    // Update user stats in the users collection
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    
    await Promise.all([
      updateDoc(currentUserRef, {
        followingCount: (currentUserDoc.data()?.following?.length || 0) + 1
      }),
      updateDoc(targetUserRef, {
        followersCount: (targetUserDoc.data()?.followers?.length || 0) + 1
      })
    ]);

    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
}

export async function unfollowUser(currentUserId, targetUserId) {
  try {
    const currentUserConnectionsRef = doc(db, 'userConnections', currentUserId);
    const targetUserConnectionsRef = doc(db, 'userConnections', targetUserId);

    // Get current documents to update counts
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(currentUserConnectionsRef),
      getDoc(targetUserConnectionsRef)
    ]);

    // Update connections
    await Promise.all([
      updateDoc(currentUserConnectionsRef, {
        following: arrayRemove(targetUserId),
        lastUpdated: new Date()
      }),
      updateDoc(targetUserConnectionsRef, {
        followers: arrayRemove(currentUserId),
        lastUpdated: new Date()
      })
    ]);

    // Update user stats
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    
    await Promise.all([
      updateDoc(currentUserRef, {
        followingCount: Math.max(0, (currentUserDoc.data()?.following?.length || 1) - 1)
      }),
      updateDoc(targetUserRef, {
        followersCount: Math.max(0, (targetUserDoc.data()?.followers?.length || 1) - 1)
      })
    ]);

    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
}

export async function getConnections(userId) {
  try {
    const connectionsRef = doc(db, 'userConnections', userId);
    const connectionsDoc = await getDoc(connectionsRef);

    if (!connectionsDoc.exists()) {
      return {
        following: [],
        followers: []
      };
    }

    return {
      following: connectionsDoc.data().following || [],
      followers: connectionsDoc.data().followers || []
    };
  } catch (error) {
    console.error('Error getting connections:', error);
    return {
      following: [],
      followers: []
    };
  }
}

export function subscribeToConnections(userId, callback) {
  const connectionsRef = doc(db, 'userConnections', userId);
  return onSnapshot(connectionsRef, (doc) => {
    if (doc.exists()) {
      callback({
        following: doc.data().following || [],
        followers: doc.data().followers || []
      });
    } else {
      callback({
        following: [],
        followers: []
      });
    }
  });
}

export async function isFollowing(currentUserId, targetUserId) {
  try {
    const connections = await getConnections(currentUserId);
    return connections.following.includes(targetUserId);
  } catch (error) {
    console.error('Error checking following status:', error);
    return false;
  }
} 