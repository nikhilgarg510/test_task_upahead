/**
 * Firebase Configuration
 * 
 * Initializes Firebase services for the application:
 * - Authentication with Google provider
 * - Firestore database
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase project configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.MEASUREMENT_ID
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Authentication service
export const auth = getAuth(app);

// Configure Google Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Initialize Firestore database
export const db = getFirestore(app);

export default app;
