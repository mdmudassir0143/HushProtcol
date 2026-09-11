/** Normalize a Twitter/X handle for Hushh usernames (lowercase, no @). */
export function normalizeTwitterHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/^@/, "");
  return clean || null;
}

/** Twitter usernames: 1–15 chars, letters / numbers / underscore. */
export const TWITTER_USERNAME_RE = /^[a-z0-9_]{1,15}$/;

export function twitterHandleFromPrivyUser(user: {
  twitter?: {username?: string | null} | null;
  linkedAccounts?: Array<{type: string; username?: string | null}>;
} | null): string | null {
  if (!user) return null;
  const direct = normalizeTwitterHandle(user.twitter?.username);
  if (direct) return direct;
  const linked = user.linkedAccounts?.find((a) => a.type === "twitter_oauth");
  return normalizeTwitterHandle(linked?.username ?? null);
}
