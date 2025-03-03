// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCHS3pljPHFAAjTkEeDrRnh8JiAVAMFovg',
  authDomain: 'blister-4781e.firebaseapp.com',
  projectId: 'blister-4781e',
  storageBucket: 'blister-4781e.firebasestorage.app',
  messagingSenderId: '688352111319',
  appId: '1:688352111319:web:8d0e3f1e1d89c902649e92',
  measurementId: 'G-DTJ74G27JB',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);
