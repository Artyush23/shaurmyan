import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

// TODO: Replace the placeholder values with your actual Firebase config.
const firebaseConfig = {
  apiKey: "AIzaSyAqRi8CRsHoirbqCBWKR5idu3XDSUn6WMU",
  authDomain: "shaurmyan-5abec.firebaseapp.com",
  projectId: "shaurmyan-5abec",
  storageBucket: "shaurmyan-5abec.firebasestorage.app",
  messagingSenderId: "517398548425",
  appId: "1:517398548425:web:5b01fa03a04cf46d8ce218",
  measurementId: "G-57S9CLLK2Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Returns a Promise that resolves to the current user enriched with an `admin` boolean.
 * The function forces a token refresh so the latest custom claims are present.
 */
export function getCurrentUser(): Promise<User & { admin?: boolean }> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        resolve(null);
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult(true); // refresh token
        const adminClaim = idTokenResult.claims.admin === true;
        resolve(Object.assign(user, { admin: adminClaim }));
      } catch (e) {
        reject(e);
      }
    }, reject);
  });
}
