// firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";

const env = import.meta.env;

// Prefer Vite env vars if provided, otherwise fall back to the existing config
// so the project still runs as-is.
const firebaseConfig = {
  apiKey:
    env.VITE_FIREBASE_API_KEY || "AIzaSyCc5FnZ_uqH_Ru5MamPQnvZ_eTzXqxAOCw",
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN || "chat-app-396ce.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "chat-app-396ce",
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || "chat-app-396ce.firebasestorage.app",
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || "545532201949",
  appId:
    env.VITE_FIREBASE_APP_ID || "1:545532201949:web:ce021ffa71da6529e20434",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export auth service
export const auth = getAuth(app);
export const db = getFirestore(app);

// Optional but recommended: keeps Firestore usable across reloads/offline.
// Safe to ignore errors (e.g. multiple tabs open).
enableIndexedDbPersistence(db).catch(() => {});
export default app;
