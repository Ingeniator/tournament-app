import { useMemo } from 'react';

export interface TelegramUser {
  telegramId: number;
  displayName: string;
  username?: string;
}

export interface TelegramContext {
  user: TelegramUser | null;
  chatInstance: string | null;
}

export function useTelegram(): TelegramContext {
  return useMemo(() => {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const chatInstance = tg?.initDataUnsafe?.chat_instance ?? null;
    console.log('[TG] WebApp:', !!tg, 'initData:', tg?.initData, 'initDataUnsafe:', JSON.stringify(tg?.initDataUnsafe));
    if (!tg || !user) return { user: null, chatInstance };

    tg.ready();
    tg.expand();

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return {
      user: { telegramId: user.id, displayName, username: user.username },
      chatInstance,
    };
  }, []);
}
