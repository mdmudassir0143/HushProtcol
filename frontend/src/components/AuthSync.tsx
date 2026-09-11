"use client";

import {useEffect, useRef} from "react";
import {useAccount} from "wagmi";
import {resolveUserByWallet, walletAuth} from "@/lib/api";
import {
  clearStoredAuthSignature,
  getStoredAuthSignature,
  setStoredAuthSignature,
} from "@/lib/authSignature";
import {getOrCreateHushKeys} from "@/lib/crypto";
import {
  clearLiveSession,
  clearSession,
  clearWalletLookup,
  getStoredUser,
  getToken,
  notifySession,
  setSession,
  setStoredUser,
  setWalletLookup,
  walletsMatch,
} from "@/lib/session";
import {toast} from "@/lib/toast";

/** Read JWT `sub` without verifying (server still verifies). */
function jwtSubject(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    ) as {sub?: string};
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * Keeps local session aligned with the connected wallet.
 * On connect: fetch user by address → store profile / mark missing username.
 * Disconnect clears JWT/profile but keeps the cached signature so reconnect
 * can silent-auth. Explicit logout (clearSession) removes the signature.
 */
export function AuthSync() {
  const {address, isConnected, status} = useAccount();
  const last = useRef<string | null>(null);
  const wasConnected = useRef(false);
  const silentAuthing = useRef(false);

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;

    async function sync() {
      if (!isConnected || !address) {
        if (wasConnected.current) {
          wasConnected.current = false;
          last.current = null;
          const hadSession = !!(getToken() || getStoredUser());
          clearWalletLookup();
          if (hadSession) {
            clearLiveSession();
            toast.info("Wallet disconnected. Reconnect to continue.");
          } else {
            notifySession();
          }
        } else {
          last.current = null;
          notifySession();
        }
        return;
      }

      wasConnected.current = true;
      const lower = address.toLowerCase();
      if (last.current === lower) return;
      last.current = lower;

      const stored = getStoredUser();
      if (stored && !walletsMatch(stored.wallet, address)) {
        clearSession({wallet: stored.wallet});
        toast.info("Wallet changed. Sign in again.");
      }

      try {
        const profile = await resolveUserByWallet(address);
        if (!profile) {
          // No username for this wallet — red-dot / claim flow.
          setWalletLookup({wallet: address, username: null});
          const current = getStoredUser();
          if (current) clearLiveSession();
          else notifySession();
          return;
        }

        setWalletLookup({wallet: address, username: profile.username});

        const token = getToken();
        const tokenSub = token ? jwtSubject(token) : null;
        // Keep JWT only if it still points at this DB user (avoids FK errors after wipe).
        if (token && tokenSub === profile.id) {
          setSession(token, profile);
          return;
        }

        if (token && tokenSub !== profile.id) {
          clearLiveSession();
        }

        // Refresh JWT via cached signature so MetaMask is not needed again.
        const cached = getStoredAuthSignature(address);
        if (cached && !silentAuthing.current) {
          silentAuthing.current = true;
          try {
            const keys = getOrCreateHushKeys(address);
            const res = await walletAuth({
              wallet: address,
              username: profile.username,
              bulletPublicKey: keys.publicKey,
              signature: cached,
            });
            setStoredAuthSignature(address, cached);
            setSession(res.token, res.user);
            return;
          } catch {
            clearStoredAuthSignature(address);
          } finally {
            silentAuthing.current = false;
          }
        }

        setStoredUser(profile);
      } catch {
        notifySession();
      }
    }

    void sync();
  }, [address, isConnected, status]);

  return null;
}
