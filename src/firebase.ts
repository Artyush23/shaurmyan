import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type AuthError,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";

export const ADMIN_EMAIL = "atucharchyan23@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

const env = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const firebaseConfig = {
  apiKey: env?.VITE_FIREBASE_API_KEY ?? "AIzaSyAqRi8CRsHoirbqCBWKR5idu3XDSUn6WMU",
  authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN ?? "shaurmyan-5abec.firebaseapp.com",
  projectId: env?.VITE_FIREBASE_PROJECT_ID ?? "shaurmyan-5abec",
  storageBucket:
    env?.VITE_FIREBASE_STORAGE_BUCKET ?? "shaurmyan-5abec.firebasestorage.app",
  messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "517398548425",
  appId: env?.VITE_FIREBASE_APP_ID ?? "1:517398548425:web:5b01fa03a04cf46d8ce218",
  measurementId: env?.VITE_FIREBASE_MEASUREMENT_ID ?? "G-57S9CLLK2Z",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
}

function normalizeProviderIds(user: User): string[] {
  return Array.from(
    new Set(
      user.providerData
        .map((provider) => provider.providerId)
        .filter((providerId): providerId is string => Boolean(providerId))
    )
  );
}

export async function upsertUserProfile(user: User): Promise<void> {
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);
  const baseProfile = {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    providerIds: normalizeProviderIds(user),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  if (snapshot.exists()) {
    await setDoc(profileRef, baseProfile, { merge: true });
    return;
  }

  await setDoc(profileRef, {
    ...baseProfile,
    createdAt: serverTimestamp(),
  });
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }

  await upsertUserProfile(credential.user);

  return credential;
}

export async function loginWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/invalid-credential":
      return "The login details were not accepted.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before finishing.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and retry.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase Auth.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Returns a Promise that resolves to the current user enriched with an `admin` boolean.
 * The function forces a token refresh so the latest custom claims are present.
 */
export function getCurrentUser(): Promise<(User & { admin?: boolean }) | null> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        unsub();
        if (!user) {
          resolve(null);
          return;
        }

        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const adminClaim = idTokenResult.claims.admin === true;
          resolve(Object.assign(user, { admin: adminClaim }));
        } catch (error) {
          reject(error);
        }
      },
      reject
    );
  });
}

export type { Firestore, AuthError };
export type { User };
