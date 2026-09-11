import type {NoteJSON} from "@bullet/sdk";

const STORAGE_KEY = "hush.pendingSends";

/** Deposit confirmed on-chain but encrypted note not yet in the backend DB. */
export type PendingSend = {
  commitment: string;
  noteJson: NoteJSON;
  /** Optional custom plaintext envelope; defaults to JSON.stringify(noteJson). */
  payloadPlaintext?: string;
  encryptedPayload: string;
  depositTxHash: string;
  recipientUsername: string;
  recipientBulletPublicKey: string;
  amount: string;
  tokenSymbol: string;
  createdAt: number;
};

function readAll(): PendingSend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSend[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PendingSend[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listPendingSends(): PendingSend[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getPendingSend(commitment: string): PendingSend | undefined {
  const c = commitment.toLowerCase();
  return readAll().find((p) => p.commitment.toLowerCase() === c);
}

/** Upsert by commitment. Call as soon as deposit confirms (+ sealed payload). */
export function upsertPendingSend(
  pending: Omit<PendingSend, "createdAt"> & {createdAt?: number}
): PendingSend {
  const items = readAll();
  const idx = items.findIndex(
    (p) => p.commitment.toLowerCase() === pending.commitment.toLowerCase()
  );
  const next: PendingSend = {
    ...pending,
    createdAt: pending.createdAt ?? Date.now(),
  };
  if (idx >= 0) {
    next.createdAt = items[idx]!.createdAt;
    items[idx] = next;
  } else {
    items.push(next);
  }
  writeAll(items);
  return next;
}

export function removePendingSend(commitment: string) {
  const c = commitment.toLowerCase();
  writeAll(readAll().filter((p) => p.commitment.toLowerCase() !== c));
}
