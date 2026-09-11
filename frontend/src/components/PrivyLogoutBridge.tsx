"use client";

import {useEffect} from "react";
import {usePrivy} from "@privy-io/react-auth";

type LogoutFn = () => Promise<void>;

let privyLogout: LogoutFn | null = null;

/** Called from useSignOut — no-op if Privy is not mounted. */
export async function logoutPrivySession() {
  if (!privyLogout) return;
  try {
    await privyLogout();
  } catch {
    // Already logged out or Privy unavailable.
  }
}

/** Registers Privy logout while the provider is mounted. */
export function PrivyLogoutBridge() {
  const {logout, authenticated, ready} = usePrivy();

  useEffect(() => {
    privyLogout = async () => {
      if (ready && authenticated) {
        await logout();
      }
    };
    return () => {
      privyLogout = null;
    };
  }, [logout, authenticated, ready]);

  return null;
}
