import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, push, onValue } from 'firebase/database';
import type { Supporter } from '@padel/common';
import { groupSupporters } from '@padel/common';
import { db } from '../firebase';

export function useSupporters() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onValue(ref(db, 'supporters'), (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<Supporter, 'id'>> | null;
      if (!data) {
        setSupporters([]);
        setLoading(false);
        return;
      }

      const list = Object.entries(data).map(([id, s]) => ({ id, ...s }));
      list.sort((a, b) => b.timestamp - a.timestamp);
      setSupporters(list);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const grouped = useMemo(() => groupSupporters(supporters), [supporters]);

  const sayThanks = useCallback(async (name: string, amount: number, message?: string) => {
    if (!db) return;
    const entry: Record<string, unknown> = { name, amount, timestamp: Date.now() };
    if (message) entry.message = message;
    await push(ref(db, 'supporters'), entry);
  }, []);

  return { supporters, grouped, loading, sayThanks };
}
