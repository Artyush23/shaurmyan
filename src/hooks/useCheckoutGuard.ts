// src/hooks/useCheckoutGuard.ts
//
// Wraps any "proceed to checkout" action so it requires authentication.
// If the user isn't signed in, it opens the AuthModal and replays the
// guarded action automatically once sign-in succeeds.

import { useCallback, useRef, useState } from "react";
import { useAuth } from "./useAuth";

export function useCheckoutGuard() {
  const { isAuthenticated, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  /** Call this from your "Checkout" button's onClick. */
  const guardCheckout = useCallback(
    (action: () => void) => {
      if (loading) return; // avoid flicker while auth state resolves
      if (isAuthenticated) {
        action();
        return;
      }
      pendingAction.current = action;
      setAuthModalOpen(true);
    },
    [isAuthenticated, loading]
  );

  /** Pass this to <AuthModal onSuccess={...}> */
  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action();
  }, []);

  return {
    authModalOpen,
    setAuthModalOpen,
    guardCheckout,
    handleAuthSuccess,
  };
}
