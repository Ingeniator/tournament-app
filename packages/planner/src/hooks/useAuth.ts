import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signIn, firebaseConfigured } from '../firebase';

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setLoading(false);
      } else {
        signIn().catch(() => setLoading(false));
      }
    });
    return unsubscribe;
  }, []);

  return { uid, loading };
}
