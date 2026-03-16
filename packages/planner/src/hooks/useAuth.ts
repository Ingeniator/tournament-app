import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from '@padel/common';
import { auth, signIn, firebaseConfigured } from '../firebase';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export function useAuth() {
  const { t } = useTranslation();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured && !!auth);
  const [authError, setAuthError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!firebaseConfigured || !auth) return;

    const attemptSignIn = () => {
      signIn().catch(() => {
        retryCount.current += 1;
        if (retryCount.current <= MAX_RETRIES) {
          const delay = BASE_DELAY_MS * 2 ** (retryCount.current - 1);
          retryTimer.current = setTimeout(attemptSignIn, delay);
        } else {
          setAuthError(t('auth.connectionFailed'));
          setLoading(false);
        }
      });
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        retryCount.current = 0;
        clearTimeout(retryTimer.current);
        setUid(user.uid);
        setAuthError(null);
        setLoading(false);
      } else {
        attemptSignIn();
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(retryTimer.current);
    };
  }, []);

  return { uid, loading, authError };
}
