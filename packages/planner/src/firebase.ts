import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_DATABASE_URL',
] as const;

const optionalEnvVars = ['VITE_FIREBASE_AUTH_DOMAIN'] as const;

const allEnvVars = [...requiredEnvVars, ...optionalEnvVars];
const presentVars = allEnvVars.filter((key) => import.meta.env[key]);
const missingRequired = requiredEnvVars.filter((key) => !import.meta.env[key]);

if (presentVars.length > 0 && missingRequired.length > 0) {
  console.error(
    `[Firebase] Incomplete config — missing: ${missingRequired.join(', ')}. ` +
      'The app will run without Firebase features.',
  );
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = missingRequired.length === 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (firebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getDatabase(app);

  if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR) {
    connectAuthEmulator(auth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR, { disableWarnings: true });
  }
}

export { auth, db };
export const signIn = () => {
  if (!auth) return Promise.reject(new Error('Firebase not configured'));
  return signInAnonymously(auth);
};

const googleProvider = new GoogleAuthProvider();

const isWebView = () => Boolean(window.Telegram?.WebApp?.initData);

export const linkWithGoogle = async () => {
  if (!auth?.currentUser) throw new Error('Not authenticated');
  if (isWebView()) {
    return linkWithRedirect(auth.currentUser, googleProvider);
  }
  return linkWithPopup(auth.currentUser, googleProvider);
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error('Firebase not configured');
  if (isWebView()) {
    return signInWithRedirect(auth, googleProvider);
  }
  return signInWithPopup(auth, googleProvider);
};

export const signInWithGoogleCredential = async (credential: import('firebase/auth').AuthCredential) => {
  if (!auth) throw new Error('Firebase not configured');
  return signInWithCredential(auth, credential);
};

export const getGoogleRedirectResult = async () => {
  if (!auth) return null;
  return getRedirectResult(auth);
};
