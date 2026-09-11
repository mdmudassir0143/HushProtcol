"use client";

import {useEffect, useState} from "react";
import {useAccount} from "wagmi";
import {
  SESSION_EVENT,
  getStoredUser,
  getToken,
  getWalletLookup,
  walletsMatch,
  type WalletLookup,
} from "@/lib/session";
import {getStoredAuthSignature} from "@/lib/authSignature";
import type {PublicUser} from "@/shared";

/** Reactive session: signed-in JWT + profile from localStorage / AuthSync. */
export function useSession() {
  const {address, isConnected} = useAccount();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lookup, setLookup] = useState<WalletLookup | null>(null);
  const [ready, setReady] = useState(false);
  const [hasCachedSignature, setHasCachedSignature] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setUser(getStoredUser());
      setToken(getToken());
      setLookup(getWalletLookup());
      setReady(true);
    };
    refresh();
    window.addEventListener(SESSION_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SESSION_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setHasCachedSignature(!!address && !!getStoredAuthSignature(address));
  }, [address, token, user?.wallet]);

  const profileForWallet =
    user && address && walletsMatch(user.wallet, address) ? user : null;
  const lookupForWallet =
    lookup && address && walletsMatch(lookup.wallet, address) ? lookup : null;

  const hasProfile = !!profileForWallet;
  const isSignedIn = !!token && hasProfile;
  /** Connected wallet has no claimed @username yet (lookup completed). */
  const needsUsername =
    isConnected &&
    !!lookupForWallet &&
    lookupForWallet.username === null &&
    !hasProfile;
  /** Connected and needs a wallet signature / JWT (register or sign-in). */
  const needsSignature = isConnected && !isSignedIn;
  /** Show red notification when signature / username claim is pending. */
  const showPendingDot = needsSignature;

  return {
    user: profileForWallet ?? (isConnected ? null : user),
    token,
    lookup: lookupForWallet,
    ready,
    isSignedIn,
    hasProfile,
    needsUsername,
    needsSignature,
    showPendingDot,
    hasCachedSignature,
  };
}
