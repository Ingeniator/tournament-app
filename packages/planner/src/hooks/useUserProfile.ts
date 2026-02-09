import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';

export function useUserProfile(uid: string | null) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !db) {
      setName(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `users/${uid}/name`), (snapshot) => {
      setName(snapshot.val() as string | null);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  const updateName = useCallback(async (newName: string) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/name`), newName);
  }, [uid]);

  return { name, loading, updateName };
}
