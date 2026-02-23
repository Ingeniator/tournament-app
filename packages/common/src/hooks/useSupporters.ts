import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supporter } from '../types/supporter';
import { generateId } from '../utils/id';
import { groupSupporters } from '../utils/groupSupporters';

const dbUrl = (import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined)?.replace(/\/$/, '');
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

const AUTH_KEY = 'supporter-auth';
const NAME_KEY = 'supporter-name';

async function getAuthToken(): Promise<string> {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      const { refreshToken } = JSON.parse(stored);
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.id_token;
      }
    } catch {
      // Fall through
    }
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  localStorage.setItem(AUTH_KEY, JSON.stringify({ refreshToken: data.refreshToken }));
  return data.idToken;
}

export function getSavedName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function useSupporters() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSupporters = useCallback(async () => {
    if (!dbUrl) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${dbUrl}/supporters.json`);
      const data = await res.json() as Record<string, Omit<Supporter, 'id'>> | null;
      if (!data) {
        setSupporters([]);
        return;
      }
      const list = Object.entries(data).map(([id, s]) => ({ id, ...s }));
      list.sort((a, b) => b.timestamp - a.timestamp);
      setSupporters(list);
    } catch {
      setSupporters([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSupporters();
  }, [fetchSupporters]);

  const grouped = useMemo(() => groupSupporters(supporters), [supporters]);

  const sayThanks = useCallback(async (name: string, amount: number, message?: string) => {
    if (!dbUrl || !apiKey) return;
    const token = await getAuthToken();
    const id = generateId();
    const entry: Record<string, unknown> = { name, amount, timestamp: Date.now() };
    if (message) entry.message = message;
    await fetch(`${dbUrl}/supporters/${id}.json?auth=${token}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
    localStorage.setItem(NAME_KEY, name);
    await fetchSupporters();
  }, [fetchSupporters]);

  return { supporters, grouped, loading, sayThanks };
}
