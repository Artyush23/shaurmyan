import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  auth,
  db,
  signOutUser as firebaseSignOut,
  upsertUserProfile,
  type UserProfile,
  type User,
} from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    setLoading(true);

    void upsertUserProfile(user).catch((error) => {
      console.error("Failed to sync auth profile:", error);
    });

    const ref = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(
      ref,
      (snapshot) => {
        if (!active) return;
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to user profile:", error);
        if (!active) return;
        setProfile(null);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribeProfile();
    };
  }, [user]);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
