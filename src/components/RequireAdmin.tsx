import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../firebase";

const ADMIN_EMAIL = "artyushcharchyan0@gmail.com";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUser(user);
        setChecking(false);
      })
      .catch(() => {
        setUser(null);
        setChecking(false);
      });
  }, []);

  if (checking) return <div>Loading...</div>;

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}