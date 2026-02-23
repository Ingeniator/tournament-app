import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import type { SkinId } from '@padel/common';
import { isValidSkin } from '@padel/common';
import { db } from '../firebase';

export function useUserProfile(uid: string | null) {
  const [name, setName] = useState<string | null>(null);
  const [skin, setSkinState] = useState<SkinId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !db) return;
    setLoading(true);
    const unsubscribe = onValue(ref(db, `users/${uid}/name`), (snapshot) => {
      setName(snapshot.val() as string | null);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid || !db) return;
    const unsubscribe = onValue(ref(db, `users/${uid}/skin`), (snapshot) => {
      const val = snapshot.val() as string | null;
      if (val && isValidSkin(val)) {
        setSkinState(val);
      }
    });
    return unsubscribe;
  }, [uid]);

  const updateName = useCallback(async (newName: string) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/name`), newName);
  }, [uid]);

  const updateSkin = useCallback(async (newSkin: SkinId) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/skin`), newSkin);
  }, [uid]);

  const updateTelegramId = useCallback(async (telegramId: number) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/telegramId`), telegramId);
  }, [uid]);

  const updateTelegramUsername = useCallback(async (username: string) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/telegramUsername`), username);
  }, [uid]);

  return { name, skin, loading, updateName, updateSkin, updateTelegramId, updateTelegramUsername };
}
