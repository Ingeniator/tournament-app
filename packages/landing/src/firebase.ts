import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.databaseURL);

let app: FirebaseApp | null = null;
let db: Database | null = null;

if (firebaseConfigured) {
  app = initializeApp(config);
  db = getDatabase(app);
}

export { db };
