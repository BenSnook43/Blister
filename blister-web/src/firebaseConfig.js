import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyCHS3pljPHFAAjTkEeDrRnh8JiAVAMFovg",
    authDomain: "blister-4781e.firebaseapp.com",
    projectId: "blister-4781e",
    storageBucket: "blister-4781e.firebasestorage.app",
    messagingSenderId: "688352111319",
    appId: "1:688352111319:web:8d0e3f1e1d89c902649e92",
    measurementId: "G-DTJ74G27JB"
  };

// Only initialize if no Firebase apps exist
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize analytics only in production and if supported
  if (import.meta.env.PROD) {
    isSupported().then(supported => {
      if (supported) {
        getAnalytics(app);
      }
    });
  }
} else {
  app = getApps()[0];
}

// Get Firestore instance
export const db = getFirestore(app);

// Get Auth instance
export const auth = getAuth(app);

export default app; 