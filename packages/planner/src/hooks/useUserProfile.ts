import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import type { Theme } from '@padel/common';
import { db } from '../firebase';

export function useUserProfile(uid: string | null) {
  const [name, setName] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !db) return;
    queueMicrotask(() => setLoading(true));
    const unsubscribe = onValue(ref(db, `users/${uid}/name`), (snapshot) => {
      setName(snapshot.val() as string | null);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!uid || !db) return;
    const unsubscribe = onValue(ref(db, `users/${uid}/theme`), (snapshot) => {
      const val = snapshot.val() as string | null;
      setThemeState(val === 'light' ? 'light' : 'dark');
    });
    return unsubscribe;
  }, [uid]);

  const updateName = useCallback(async (newName: string) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/name`), newName);
  }, [uid]);

  const updateTheme = useCallback(async (newTheme: Theme) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/theme`), newTheme);
  }, [uid]);

  const updateTelegramId = useCallback(async (telegramId: number) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/telegramId`), telegramId);
  }, [uid]);

  const updateTelegramUsername = useCallback(async (username: string) => {
    if (!uid || !db) return;
    await set(ref(db, `users/${uid}/telegramUsername`), username);
  }, [uid]);

  return { name, theme, loading, updateName, updateTheme, updateTelegramId, updateTelegramUsername };
}
