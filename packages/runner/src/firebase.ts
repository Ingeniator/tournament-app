import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.databaseURL);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (firebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getDatabase(app);
}

export { auth, db };
export const signIn = () => {
  if (!auth) return Promise.reject(new Error('Firebase not configured'));
  return signInAnonymously(auth);
};
