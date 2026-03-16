import { useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { SkinId } from '@padel/common';
import { useTheme, isValidSkin, DEFAULT_SKIN } from '@padel/common';
import { useAuth as useFirebaseAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTelegram, type TelegramUser } from '../hooks/useTelegram';
import { useTelegramSync } from '../hooks/useTelegramSync';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

export interface AuthContextValue {
  uid: string | null;
  authLoading: boolean;
  authError: string | null;
  userName: string | null;
  userNameLoading: boolean;
  updateUserName: (name: string) => Promise<void>;
  telegramUser: TelegramUser | null;
  chatInstance: string | null;
  isGoogleLinked: boolean;
  googleEmail: string | null;
  linkGoogle: () => Promise<void>;
  googleLinking: boolean;
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
}

const AuthCtx = createContext<AuthContextValue>(null!);

export function useAuthCtx() {
  return useContext(AuthCtx);
}

const SKIN_KEY = 'padel-skin';

function loadLocalSkin(): SkinId {
  try {
    const data = localStorage.getItem(SKIN_KEY);
    if (data && isValidSkin(data)) return data;
    return DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

const initialSkin = loadLocalSkin();

export function AuthProvider({ children }: { children: ReactNode }) {
  const { uid, loading: authLoading, authError } = useFirebaseAuth();
  const { name: userName, skin: userSkin, loading: userNameLoading, updateName: updateUserName, updateSkin: updateUserSkin, updateTelegramId, updateTelegramUsername } = useUserProfile(uid);
  const { user: telegramUser, chatInstance } = useTelegram();
  const { isGoogleLinked, googleEmail, linkGoogle, linking: googleLinking } = useGoogleAuth(uid);
  const { skin, setSkin: rawSetSkin } = useTheme(initialSkin);

  // Firebase is source of truth — sync to local state and localStorage cache
  useEffect(() => {
    if (userSkin) {
      rawSetSkin(userSkin);
      try { localStorage.setItem(SKIN_KEY, userSkin); } catch {}
    }
  }, [userSkin, rawSetSkin]);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    updateUserSkin(s).catch(e => console.warn('Failed to save skin:', e));
    try { localStorage.setItem(SKIN_KEY, s); } catch {}
  }, [rawSetSkin, updateUserSkin]);

  // Auto-set profile from Telegram identity
  useEffect(() => {
    if (!uid || !telegramUser || userNameLoading) return;
    if (!userName) {
      updateUserName(telegramUser.displayName);
    }
    updateTelegramId(telegramUser.telegramId);
    if (telegramUser.username) {
      updateTelegramUsername(telegramUser.username);
    }
  }, [uid, telegramUser, userName, userNameLoading, updateUserName, updateTelegramId, updateTelegramUsername]);

  // Cross-device sync: claim registrations from previous device UID
  useTelegramSync(uid, telegramUser?.username);

  return (
    <AuthCtx.Provider value={{
      uid,
      authLoading,
      authError,
      userName,
      userNameLoading,
      updateUserName,
      telegramUser,
      chatInstance,
      isGoogleLinked,
      googleEmail,
      linkGoogle,
      googleLinking,
      skin,
      setSkin,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
