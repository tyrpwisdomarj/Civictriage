import { useCallback, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  GUEST_DEMO_USER,
  sanitizeUserId,
  type UserProfile,
  type UserRole,
  type VaultSectionKey,
} from '../shared/authSchema';

const ACTIVE_LOCAL_SESSION_KEY = 'civictriage_active_profile_v1';
const LOCAL_ACCOUNTS_DIRECTORY_KEY = 'civictriage_local_accounts_v1';
const LOCAL_CREDENTIALS_KEY = 'civictriage_local_cred_verifiers_v1';

interface LocalCredentialVerifier {
  userId: string;
  email: string;
  saltHex: string;
  derivedHex: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  homeDistrictId: string;
  homeDistrictName: string;
  role: UserRole;
  abhaHealthId?: string;
  academicStream?: string;
}

export interface UpdateProfileInput {
  fullName: string;
  homeDistrictId: string;
  homeDistrictName: string;
  role: UserRole;
  abhaHealthId?: string;
  academicStream?: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveLocalPasswordHash(
  password: string,
  saltHex: string
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBytes = hexToBytes(saltHex);
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function computeEmailUserId(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return `usr_${bytesToHex(new Uint8Array(digest)).slice(0, 16)}`;
}

function loadSavedDirectory(): UserProfile[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_DIRECTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserProfile[]) : [];
  } catch {
    return [];
  }
}

function saveDirectoryEntry(profile: UserProfile): UserProfile[] {
  const current = loadSavedDirectory().filter(
    (p) => p.userId !== profile.userId && p.email.toLowerCase() !== profile.email.toLowerCase()
  );
  const next = [profile, ...current].slice(0, 12);
  try {
    window.localStorage.setItem(LOCAL_ACCOUNTS_DIRECTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  return next;
}

function loadLocalVerifiers(): LocalCredentialVerifier[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalCredentialVerifier[]) : [];
  } catch {
    return [];
  }
}

function saveLocalVerifier(entry: LocalCredentialVerifier): void {
  const existing = loadLocalVerifiers().filter(
    (v) => v.email.toLowerCase() !== entry.email.toLowerCase()
  );
  try {
    window.localStorage.setItem(
      LOCAL_CREDENTIALS_KEY,
      JSON.stringify([entry, ...existing].slice(0, 20))
    );
  } catch {
    // Ignore quota errors
  }
}

function persistActiveProfile(profile: UserProfile | null): void {
  try {
    if (!profile) {
      window.localStorage.removeItem(ACTIVE_LOCAL_SESSION_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_LOCAL_SESSION_KEY, JSON.stringify(profile));
    }
  } catch {
    // Ignore storage errors
  }
}

function loadPersistedProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed && typeof parsed.userId === 'string' && typeof parsed.fullName === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export type AuthModalMode = 'signin' | 'signup' | 'profile';

export function useUserVaultAuth() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => loadPersistedProfile());
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authGateOpen, setAuthGateOpen] = useState<boolean>(() => !loadPersistedProfile());
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>(() => loadSavedDirectory());
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);

  // Server Bearer token is held strictly in React memory (never localStorage)
  const serverBearerTokenRef = useRef<string | null>(null);

  const upsertFirebaseProfile = useCallback(
    async (fbUser: FirebaseUser): Promise<UserProfile> => {
      const uid = fbUser.uid;
      const profileRef = doc(db, 'users', uid);
      const profilePath = `users/${uid}`;

      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          return {
            userId: uid,
            fullName: String(data.fullName || fbUser.displayName || 'Kerala Citizen'),
            email: String(data.email || fbUser.email || ''),
            homeDistrictId: String(data.homeDistrictId || 'pathanamthitta'),
            homeDistrictName: String(data.homeDistrictName || 'Pathanamthitta, Kerala'),
            role:
              data.role === 'LSG / Police Officer' ? 'LSG / Police Officer' : 'Citizen',
            abhaHealthId: typeof data.abhaHealthId === 'string' ? data.abhaHealthId : '',
            academicStream:
              typeof data.academicStream === 'string' ? data.academicStream : '',
            authProvider: 'google',
          };
        }

        const newProfile: UserProfile = {
          userId: uid,
          fullName: (fbUser.displayName || fbUser.email?.split('@')[0] || 'Kerala Citizen').slice(
            0,
            120
          ),
          email: fbUser.email || `${uid}@google.local`,
          homeDistrictId: 'pathanamthitta',
          homeDistrictName: 'Pathanamthitta, Kerala',
          role: 'Citizen',
          abhaHealthId: '',
          academicStream: 'Science & CS (PCM + Computer Science)',
          authProvider: 'google',
        };

        await setDoc(profileRef, {
          ownerId: uid,
          fullName: newProfile.fullName,
          email: newProfile.email,
          homeDistrictId: newProfile.homeDistrictId,
          homeDistrictName: newProfile.homeDistrictName,
          role: newProfile.role,
          abhaHealthId: newProfile.abhaHealthId ?? '',
          academicStream: newProfile.academicStream ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return newProfile;
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, profilePath);
        } catch {
          // Graceful fallback so preview sessions never crash if offline/unverified
        }
        return {
          userId: uid,
          fullName: fbUser.displayName || 'Kerala Citizen',
          email: fbUser.email || '',
          homeDistrictId: 'pathanamthitta',
          homeDistrictName: 'Pathanamthitta, Kerala',
          role: 'Citizen',
          abhaHealthId: '',
          academicStream: '',
          authProvider: 'google',
        };
      }
    },
    []
  );

  // Subscribe to Firebase Auth state (Google Sign-In)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.emailVerified) {
        const profile = await upsertFirebaseProfile(fbUser);
        setActiveUser(profile);
        persistActiveProfile(profile);
        setSavedAccounts(saveDirectoryEntry(profile));
        setCloudSyncEnabled(true);
        setAuthGateOpen(false);
      } else {
        setCloudSyncEnabled(false);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [upsertFirebaseProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const profile = await upsertFirebaseProfile(fbUser);
      setActiveUser(profile);
      persistActiveProfile(profile);
      setSavedAccounts(saveDirectoryEntry(profile));
      setCloudSyncEnabled(Boolean(fbUser.emailVerified));
      setAuthGateOpen(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Google sign-in window was closed. Please try again or use Email Sign-In.');
      } else if (msg.includes('unauthorized-domain') || msg.includes('operation-not-allowed')) {
        setAuthError(
          'Google Sign-In popup is restricted in this preview host. Please create an Email account or Continue as Guest.'
        );
      } else {
        setAuthError(msg);
      }
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, [upsertFirebaseProfile]);

  const signUpWithEmail = useCallback(async (input: SignUpInput): Promise<boolean> => {
    setAuthBusy(true);
    setAuthError(null);
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();

    if (cleanName.length < 2) {
      setAuthError('Please enter your full name (at least 2 characters).');
      setAuthBusy(false);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address.');
      setAuthBusy(false);
      return false;
    }
    if (input.password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      setAuthBusy(false);
      return false;
    }

    try {
      let profile: UserProfile | null = null;
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password: input.password,
          homeDistrictId: input.homeDistrictId,
          homeDistrictName: input.homeDistrictName,
          role: input.role,
          abhaHealthId: input.abhaHealthId?.trim() || '',
          academicStream: input.academicStream?.trim() || '',
        }),
      });

      const data = (await resp.json().catch(() => null)) as {
        token?: string;
        profile?: UserProfile;
        error?: string;
      } | null;

      if (resp.status === 409) {
        setAuthError(data?.error || 'An account with this email already exists. Please sign in.');
        return false;
      }

      if (resp.ok && data?.profile) {
        serverBearerTokenRef.current = data.token ?? null;
        profile = data.profile;
      } else if (!resp.ok && resp.status < 500 && data?.error) {
        setAuthError(data.error);
        return false;
      }

      // Compute local PBKDF2 verifier so returning users can sign in smoothly across server restarts
      const saltBytes = new Uint8Array(16);
      window.crypto.getRandomValues(saltBytes);
      const saltHex = bytesToHex(saltBytes);
      const derivedHex = await deriveLocalPasswordHash(input.password, saltHex);

      if (!profile) {
        const userId = await computeEmailUserId(cleanEmail);
        profile = {
          userId,
          fullName: cleanName,
          email: cleanEmail,
          homeDistrictId: input.homeDistrictId || 'pathanamthitta',
          homeDistrictName: input.homeDistrictName || 'Pathanamthitta, Kerala',
          role: input.role,
          abhaHealthId: input.abhaHealthId?.trim() || '',
          academicStream: input.academicStream?.trim() || '',
          authProvider: 'password',
          createdAt: new Date().toISOString(),
        };
      }

      saveLocalVerifier({
        userId: profile.userId,
        email: cleanEmail,
        saltHex,
        derivedHex,
      });

      setActiveUser(profile);
      persistActiveProfile(profile);
      setSavedAccounts(saveDirectoryEntry(profile));
      setCloudSyncEnabled(false);
      setAuthGateOpen(false);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Account creation failed.');
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    async (emailInput: string, password: string): Promise<boolean> => {
      setAuthBusy(true);
      setAuthError(null);
      const cleanEmail = emailInput.trim().toLowerCase();
      if (!cleanEmail || !password) {
        setAuthError('Please enter both your email address and password.');
        setAuthBusy(false);
        return false;
      }

      try {
        // 1. Try server-side scrypt verification first
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = (await resp.json().catch(() => null)) as {
          token?: string;
          profile?: UserProfile;
          error?: string;
        } | null;

        if (resp.ok && data?.profile) {
          serverBearerTokenRef.current = data.token ?? null;
          setActiveUser(data.profile);
          persistActiveProfile(data.profile);
          setSavedAccounts(saveDirectoryEntry(data.profile));
          setCloudSyncEnabled(false);
          setAuthGateOpen(false);
          return true;
        }

        // 2. Fallback to local PBKDF2 verifier if server restarted in dev
        const localVerifiers = loadLocalVerifiers();
        const match = localVerifiers.find((v) => v.email.toLowerCase() === cleanEmail);
        if (match) {
          const checkHex = await deriveLocalPasswordHash(password, match.saltHex);
          if (checkHex === match.derivedHex) {
            const savedProfile = loadSavedDirectory().find(
              (p) => p.email.toLowerCase() === cleanEmail
            );
            const resolvedProfile: UserProfile = savedProfile ?? {
              userId: match.userId,
              fullName: cleanEmail.split('@')[0],
              email: cleanEmail,
              homeDistrictId: 'pathanamthitta',
              homeDistrictName: 'Pathanamthitta, Kerala',
              role: 'Citizen',
              authProvider: 'password',
            };
            setActiveUser(resolvedProfile);
            persistActiveProfile(resolvedProfile);
            setSavedAccounts(saveDirectoryEntry(resolvedProfile));
            setCloudSyncEnabled(false);
            setAuthGateOpen(false);
            return true;
          }
        }

        setAuthError(data?.error || 'Invalid email or password. Please try again.');
        return false;
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const continueAsGuest = useCallback(() => {
    setAuthError(null);
    serverBearerTokenRef.current = null;
    setActiveUser(GUEST_DEMO_USER);
    persistActiveProfile(GUEST_DEMO_USER);
    setCloudSyncEnabled(false);
    setAuthGateOpen(false);
  }, []);

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput): Promise<boolean> => {
      if (!activeUser) return false;
      setAuthBusy(true);
      setAuthError(null);
      try {
        const nextProfile: UserProfile = {
          ...activeUser,
          fullName: updates.fullName.trim() || activeUser.fullName,
          homeDistrictId: updates.homeDistrictId,
          homeDistrictName: updates.homeDistrictName,
          role: updates.role,
          abhaHealthId: updates.abhaHealthId?.trim() || '',
          academicStream: updates.academicStream?.trim() || '',
        };

        if (activeUser.authProvider === 'google' && auth.currentUser?.emailVerified) {
          const profileRef = doc(db, 'users', activeUser.userId);
          const profilePath = `users/${activeUser.userId}`;
          try {
            await updateDoc(profileRef, {
              fullName: nextProfile.fullName,
              email: nextProfile.email,
              homeDistrictId: nextProfile.homeDistrictId,
              homeDistrictName: nextProfile.homeDistrictName,
              role: nextProfile.role,
              abhaHealthId: nextProfile.abhaHealthId ?? '',
              academicStream: nextProfile.academicStream ?? '',
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            try {
              handleFirestoreError(err, OperationType.UPDATE, profilePath);
            } catch {
              // Keep local state updated even if cloud update fails
            }
          }
        } else if (
          activeUser.authProvider === 'password' &&
          serverBearerTokenRef.current
        ) {
          await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serverBearerTokenRef.current}`,
            },
            body: JSON.stringify(updates),
          }).catch(() => {});
        }

        setActiveUser(nextProfile);
        persistActiveProfile(nextProfile);
        if (nextProfile.authProvider !== 'guest') {
          setSavedAccounts(saveDirectoryEntry(nextProfile));
        }
        setAuthGateOpen(false);
        return true;
      } finally {
        setAuthBusy(false);
      }
    },
    [activeUser]
  );

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    serverBearerTokenRef.current = null;
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Ignore Firebase signOut failure
    }
    setActiveUser(null);
    persistActiveProfile(null);
    setCloudSyncEnabled(false);
    setAuthModalMode('signin');
    setAuthGateOpen(true);
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = 'signin') => {
    setAuthError(null);
    setAuthModalMode(mode);
    setAuthGateOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    if (!activeUser) return; // Gate requires selecting an account or Guest on first launch
    setAuthError(null);
    setAuthGateOpen(false);
  }, [activeUser]);

  // Firestore Vault Sync helpers (active only when signed in with verified Firebase Google Auth)
  const loadCloudVaultForUser = useCallback(
    async (userId: string): Promise<Partial<Record<VaultSectionKey, unknown>> | null> => {
      if (!auth.currentUser || auth.currentUser.uid !== userId || !auth.currentUser.emailVerified) {
        return null;
      }
      const vaultPath = `users/${userId}/vault`;
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'vault'));
        const result: Partial<Record<VaultSectionKey, unknown>> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (typeof data.sectionKey === 'string' && typeof data.payloadJson === 'string') {
            try {
              result[data.sectionKey as VaultSectionKey] = JSON.parse(data.payloadJson);
            } catch {
              // Ignore malformed JSON slice
            }
          }
        });
        return result;
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.LIST, vaultPath);
        } catch {
          // Graceful fallback to local namespaced vault
        }
        return null;
      }
    },
    []
  );

  const syncVaultSectionToCloud = useCallback(
    async (userId: string, sectionKey: VaultSectionKey, value: unknown): Promise<void> => {
      if (!auth.currentUser || auth.currentUser.uid !== userId || !auth.currentUser.emailVerified) {
        return;
      }
      const serialized = JSON.stringify(value ?? null);
      if (serialized.length > 440000) return; // Guard against oversized base64 images exceeding doc limit
      const docPath = `users/${userId}/vault/${sectionKey}`;
      const docRef = doc(db, 'users', userId, 'vault', sectionKey);
      try {
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          await updateDoc(docRef, {
            payloadJson: serialized,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(docRef, {
            ownerId: userId,
            sectionKey,
            payloadJson: serialized,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        } catch {
          // Non-blocking cloud sync fallback
        }
      }
    },
    []
  );

  const effectiveUser = activeUser ?? GUEST_DEMO_USER;
  const activeUserId = sanitizeUserId(effectiveUser.userId);

  return {
    activeUser,
    effectiveUser,
    activeUserId,
    authReady,
    authGateOpen,
    authModalMode,
    authBusy,
    authError,
    savedAccounts,
    cloudSyncEnabled,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    continueAsGuest,
    updateProfile,
    signOutUser,
    openAuthModal,
    closeAuthModal,
    setAuthModalMode,
    loadCloudVaultForUser,
    syncVaultSectionToCloud,
  };
}
