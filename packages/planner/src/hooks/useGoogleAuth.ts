import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleAuthProvider } from 'firebase/auth';
import { ref, get, set, update, runTransaction } from 'firebase/database';
import { useTranslation } from '@padel/common';
import { auth, db, linkWithGoogle, signInWithGoogleCredential, signInWithGoogle, getGoogleRedirectResult } from '../firebase';

const PRE_LINK_UID_KEY = 'google-link-pre-uid';

export function useGoogleAuth(uid: string | null) {
  const { t } = useTranslation();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGoogleLinked = useMemo(() => {
    if (!auth?.currentUser) return false;
    return auth.currentUser.providerData.some(p => p.providerId === 'google.com');
  }, [uid, linking]); // re-check when uid changes or linking completes

  const googleEmail = useMemo(() => {
    if (!auth?.currentUser) return null;
    const google = auth.currentUser.providerData.find(p => p.providerId === 'google.com');
    return google?.email ?? null;
  }, [uid, linking]);

  const claimSweep = useCallback(async (oldUid: string, newUid: string) => {
    if (!db || oldUid === newUid) return;

    // Read old user's organized and registrations
    const [organizedSnap, registrationsSnap] = await Promise.all([
      get(ref(db, `users/${oldUid}/organized`)),
      get(ref(db, `users/${oldUid}/registrations`)),
    ]);

    // Sweep organized tournaments using transactions
    const organized = organizedSnap.val() as Record<string, boolean> | null;
    if (organized) {
      for (const tournamentId of Object.keys(organized)) {
        await runTransaction(ref(db, `tournaments/${tournamentId}/organizerId`), (current) => {
          if (current !== oldUid) return; // abort: not owned by old user
          return newUid;
        });
        // Move index entries regardless — idempotent deletes are safe
        await update(ref(db), {
          [`users/${oldUid}/organized/${tournamentId}`]: null,
          [`users/${newUid}/organized/${tournamentId}`]: true,
        });
      }
    }

    // Sweep registrations using transactions
    const registrations = registrationsSnap.val() as Record<string, boolean> | null;
    if (registrations) {
      for (const tournamentId of Object.keys(registrations)) {
        const playersRef = ref(db, `tournaments/${tournamentId}/players`);
        const { committed } = await runTransaction(playersRef, (players) => {
          if (!players || !players[oldUid]) return; // abort: no old player data
          if (players[newUid]) return; // abort: new uid already registered
          players[newUid] = players[oldUid];
          delete players[oldUid];
          return players;
        });
        if (committed) {
          await update(ref(db), {
            [`users/${oldUid}/registrations/${tournamentId}`]: null,
            [`users/${newUid}/registrations/${tournamentId}`]: true,
          });
        }
      }
    }

    // Copy profile name if new user doesn't have one
    const oldNameSnap = await get(ref(db, `users/${oldUid}/name`));
    if (oldNameSnap.exists()) {
      // Transaction ensures we don't overwrite if newUid got a name concurrently
      await runTransaction(ref(db, `users/${newUid}/name`), (currentName) => {
        if (currentName) return; // abort: already has a name
        return oldNameSnap.val();
      });
    }
  }, []);

  // Handle redirect result on page load (for Telegram WebView flow)
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getGoogleRedirectResult();
        if (!result || cancelled) return;

        // Redirect completed — store google email
        const email = result.user.providerData.find(p => p.providerId === 'google.com')?.email;
        if (email && db) {
          await set(ref(db, `users/${result.user.uid}/googleEmail`), email);
        }

        // Check if we need to do a claim sweep
        const preUid = sessionStorage.getItem(PRE_LINK_UID_KEY);
        sessionStorage.removeItem(PRE_LINK_UID_KEY);
        if (preUid && preUid !== result.user.uid) {
          await claimSweep(preUid, result.user.uid);
        }
      } catch (err: unknown) {
        const firebaseError = err as { code?: string };
        if (firebaseError.code === 'auth/credential-already-in-use') {
          // Link failed because Google account is already used.
          // In redirect flow we can't recover the credential, so prompt user
          // to try again — signInWithRedirect will be used instead.
          const preUid = sessionStorage.getItem(PRE_LINK_UID_KEY);
          if (preUid) {
            sessionStorage.setItem(PRE_LINK_UID_KEY, preUid); // keep for next redirect
            await signInWithGoogle(); // triggers another redirect
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uid, claimSweep]);

  const linkGoogle = useCallback(async () => {
    if (!uid || !auth?.currentUser) return;
    setLinking(true);
    setError(null);

    const oldUid = uid;

    // Save current UID before redirect (for claim sweep after return)
    try { sessionStorage.setItem(PRE_LINK_UID_KEY, oldUid); } catch {}

    try {
      // Try to link Google to current anonymous account (preserves UID)
      const result = await linkWithGoogle();
      // linkWithRedirect returns void (page navigates away), so only popup gets here
      if (result) {
        const email = auth.currentUser?.providerData.find(p => p.providerId === 'google.com')?.email;
        if (email && db) {
          await set(ref(db, `users/${uid}/googleEmail`), email);
        }
        sessionStorage.removeItem(PRE_LINK_UID_KEY);
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };

      if (firebaseError.code === 'auth/credential-already-in-use') {
        // Google account already linked to a different Firebase user.
        // Sign in with the Google credential to get the existing account.
        try {
          const credential = GoogleAuthProvider.credentialFromError(err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
          if (credential) {
            await signInWithGoogleCredential(credential);
          } else {
            // Fallback: popup or redirect sign-in
            await signInWithGoogle();
            // If redirect, page navigates away — won't reach here
          }

          // Now auth.currentUser is the Google-linked account (popup flow)
          const newUid = auth.currentUser?.uid;
          if (newUid && newUid !== oldUid) {
            await claimSweep(oldUid, newUid);
          }
          sessionStorage.removeItem(PRE_LINK_UID_KEY);
        } catch (signInErr) {
          console.error('Google sign-in failed:', signInErr);
          setError(t('auth.googleSignInFailed'));
          sessionStorage.removeItem(PRE_LINK_UID_KEY);
          setLinking(false);
          return;
        }
      } else if (firebaseError.code === 'auth/popup-closed-by-user') {
        // User cancelled - not an error
        sessionStorage.removeItem(PRE_LINK_UID_KEY);
        setLinking(false);
        return;
      } else {
        console.error('Google link failed:', err);
        setError(t('auth.googleLinkFailed'));
        sessionStorage.removeItem(PRE_LINK_UID_KEY);
        setLinking(false);
        return;
      }
    }

    setLinking(false);
  }, [uid, claimSweep]);

  return { isGoogleLinked, googleEmail, linkGoogle, linking, error };
}
