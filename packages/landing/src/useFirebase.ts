import { useRef, useState, useCallback } from 'react';
import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';

export interface FirebaseInstance {
  auth: Auth;
  db: Database;
  signIn: () => Promise<unknown>;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
  ref: typeof import('firebase/database').ref;
  onValue: typeof import('firebase/database').onValue;
  set: typeof import('firebase/database').set;
  push: typeof import('firebase/database').push;
}

let cached: FirebaseInstance | null = null;
let loading: Promise<FirebaseInstance | null> | null = null;

async function loadFirebase(): Promise<FirebaseInstance | null> {
  if (cached) return cached;

  const mod = await import('./firebase');
  if (!mod.firebaseConfigured || !mod.auth || !mod.db) return null;

  cached = {
    auth: mod.auth!,
    db: mod.db!,
    signIn: mod.signIn,
    onAuthStateChanged: mod.onAuthStateChanged,
    ref: mod.ref,
    onValue: mod.onValue,
    set: mod.set,
    push: mod.push,
  };
  return cached;
}

export function useFirebase() {
  const [instance, setInstance] = useState<FirebaseInstance | null>(cached);
  const initCalled = useRef(false);

  const init = useCallback(async () => {
    if (initCalled.current) return cached ?? instance;
    initCalled.current = true;

    if (cached) {
      setInstance(cached);
      return cached;
    }

    if (!loading) {
      loading = loadFirebase();
    }
    const result = await loading;
    setInstance(result);
    return result;
  }, [instance]);

  return { firebase: instance, initFirebase: init };
}
