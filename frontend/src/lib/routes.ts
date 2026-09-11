/** App path segments that must not be treated as usernames. */
export const RESERVED_PATHS = new Set([
  "send",
  "scratch",
  "inbox",
  "lookout",
  "account",
  "register",
  "privacy",
  "claim",
  "c",
  "auth",
  "api",
  "favicon.ico",
  "_next",
]);

export function normalizeUsernameParam(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

/** Public profile URL: /{username} */
export function profilePath(username: string): string {
  const u = normalizeUsernameParam(username);
  return u ? `/${u}` : "/register";
}

export function isReservedPath(segment: string): boolean {
  return RESERVED_PATHS.has(segment.trim().toLowerCase().replace(/^@/, ""));
}

export function isAppShellPath(pathname: string): boolean {
  if (
    pathname.startsWith("/lookout") ||
    pathname.startsWith("/send") ||
    pathname.startsWith("/scratch") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/claim")
  ) {
    return true;
  }
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 1 && !isReservedPath(seg[0]!)) return true;
  return false;
}
