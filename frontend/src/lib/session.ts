import type {PublicUser} from "@/shared";
import {clearStoredAuthSignature} from "@/lib/authSignature";

const TOKEN_KEY = "hush.jwt";
const USER_KEY = "hush.user";
/** Last wallet lookup: which address we fetched and whether it has a username. */
const LOOKUP_KEY = "hush.walletLookup";
export const SESSION_EVENT = "hush:session";

export type WalletLookup = {
  wallet: string;
  /** null = connected wallet has no claimed username yet. */
  username: string | null;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): PublicUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function getWalletLookup(): WalletLookup | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOOKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WalletLookup;
  } catch {
    return null;
  }
}

export function setWalletLookup(lookup: WalletLookup | null) {
  if (typeof window === "undefined") return;
  if (lookup) {
    localStorage.setItem(
      LOOKUP_KEY,
      JSON.stringify({
        wallet: lookup.wallet.toLowerCase(),
        username: lookup.username,
      })
    );
  } else {
    localStorage.removeItem(LOOKUP_KEY);
  }
  notifySession();
}

export function setSession(token: string, user: PublicUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(
    LOOKUP_KEY,
    JSON.stringify({
      wallet: user.wallet.toLowerCase(),
      username: user.username,
    })
  );
  notifySession();
}

/** Persist profile without a JWT (preview after wallet lookup). */
export function setStoredUser(user: PublicUser | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(
      LOOKUP_KEY,
      JSON.stringify({
        wallet: user.wallet.toLowerCase(),
        username: user.username,
      })
    );
  } else {
    localStorage.removeItem(USER_KEY);
  }
  notifySession();
}

export function clearSession(opts?: {wallet?: string}) {
  const wallet = opts?.wallet || getStoredUser()?.wallet;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LOOKUP_KEY);
  clearStoredAuthSignature(wallet);
  notifySession();
}

/** Drop JWT + profile but keep the wallet auth signature for silent re-auth. */
export function clearLiveSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifySession();
}

export function clearWalletLookup() {
  localStorage.removeItem(LOOKUP_KEY);
  notifySession();
}

/** Drop JWT but keep cached profile (needs re-sign or cached signature). */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  notifySession();
}

export function notifySession() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function walletsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
