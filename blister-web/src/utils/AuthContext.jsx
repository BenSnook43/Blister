import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { createUserDocument } from './userUtils';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    
    // Set persistence to LOCAL
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error('Error setting auth persistence:', error);
      });

    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
      if (user) {
        try {
          // Ensure user document exists
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            console.log('Creating new user document');
            await createUserDocument(user);
          }
          setUser(user);
        } catch (error) {
          console.error('Error setting up user:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add your admin email here
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const value = {
    user,
    currentUser: user, // Add currentUser alias for consistency
    isAdmin,
    loading,
    error
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 