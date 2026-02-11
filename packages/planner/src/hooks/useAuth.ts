import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signIn, firebaseConfigured } from '../firebase';

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setAuthError(null);
        setLoading(false);
      } else {
        signIn().catch(() => {
          setAuthError('Could not connect. Check your internet and try again.');
          setLoading(false);
        });
      }
    });
    return unsubscribe;
  }, []);

  return { uid, loading, authError };
}
