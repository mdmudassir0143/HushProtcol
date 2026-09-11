const STORAGE_KEY = "hush.recentRecipients";
const MAX_RECENTS = 16;

export type RecentRecipientKind = "twitter" | "email";

export type RecentRecipient = {
  kind: RecentRecipientKind;
  /** Username without @, or email address. */
  value: string;
  lastUsedAt: number;
};

function normalizeValue(kind: RecentRecipientKind, raw: string): string {
  const trimmed = raw.trim();
  if (kind === "email") return trimmed.toLowerCase();
  return trimmed.replace(/^@+/g, "").toLowerCase();
}

function readAll(): RecentRecipient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentRecipient[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r) =>
          r &&
          (r.kind === "twitter" || r.kind === "email") &&
          typeof r.value === "string" &&
          r.value.length > 0 &&
          typeof r.lastUsedAt === "number"
      )
      .map((r) => ({
        kind: r.kind,
        value: normalizeValue(r.kind, r.value),
        lastUsedAt: r.lastUsedAt,
      }));
  } catch {
    return [];
  }
}

function writeAll(items: RecentRecipient[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)));
}

/** Most-recent first. */
export function listRecentRecipients(
  kind?: RecentRecipientKind
): RecentRecipient[] {
  const all = readAll().sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  if (!kind) return all;
  return all.filter((r) => r.kind === kind);
}

/** Upsert and bump to most recent. */
export function rememberRecentRecipient(
  kind: RecentRecipientKind,
  raw: string
): void {
  const value = normalizeValue(kind, raw);
  if (!value) return;
  const items = readAll().filter(
    (r) => !(r.kind === kind && r.value === value)
  );
  items.unshift({kind, value, lastUsedAt: Date.now()});
  writeAll(items);
}

export function removeRecentRecipient(
  kind: RecentRecipientKind,
  raw: string
): void {
  const value = normalizeValue(kind, raw);
  writeAll(
    readAll().filter((r) => !(r.kind === kind && r.value === value))
  );
}

/** Filter recents by typed query (empty query → all for kind). */
export function filterRecentRecipients(
  kind: RecentRecipientKind,
  query: string,
  opts?: {exclude?: string; limit?: number}
): RecentRecipient[] {
  const q = normalizeValue(kind, query);
  const exclude = opts?.exclude
    ? normalizeValue(kind, opts.exclude)
    : undefined;
  const limit = opts?.limit ?? 8;
  return listRecentRecipients(kind)
    .filter((r) => {
      if (exclude && r.value === exclude) return false;
      if (!q) return true;
      return r.value.includes(q);
    })
    .slice(0, limit);
}
