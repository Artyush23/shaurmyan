import { type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-stone-400">
        Checking admin access...
      </div>
    );
  }

  if (!isAdmin) {
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
