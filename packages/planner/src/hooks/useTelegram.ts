import { useMemo } from 'react';

export interface TelegramUser {
  telegramId: number;
  displayName: string;
}

export function useTelegram(): TelegramUser | null {
  return useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    if (!tg || !user) return null;

    tg.ready();
    tg.expand();

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return { telegramId: user.id, displayName };
  }, []);
}
