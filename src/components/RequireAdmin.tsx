import { useEffect, useState, type ReactNode } from "react";
import { getCurrentUser } from "../firebase";

const ADMIN_EMAIL = "artyushcharchyan0@gmail.com";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (!active) return;
        setIsAllowed(Boolean(user && user.email === ADMIN_EMAIL));
        setIsChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setIsAllowed(false);
        setIsChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-stone-400">
        Checking admin access...
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-center px-6">
        <p className="max-w-sm text-sm text-stone-500">
          You do not have access to this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
