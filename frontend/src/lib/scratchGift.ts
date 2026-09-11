import type {NoteJSON} from "@bullet/sdk";

export type ScratchTheme = "crimson" | "azure" | "emerald";

export type ScratchGiftMeta = {
  /** Scratch card name shown on the left panel. */
  title: string;
  message?: string;
  theme: ScratchTheme;
};

export type ScratchClaimPayload = {
  kind: "scratch";
  note: NoteJSON;
  noteId?: string;
  amountLabel: string;
  tokenSymbol: string;
  recipientUsername?: string;
  meta: ScratchGiftMeta;
};

export type StoredScratchGiftPayload = {
  kind: "scratch";
  note: NoteJSON;
  claim: ScratchClaimPayload;
};

export type StoredPaymentPayload =
  | {kind: "standard"; note: NoteJSON}
  | StoredScratchGiftPayload;

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function normalizeTheme(raw: unknown): ScratchTheme {
  if (raw === "azure" || raw === "crimson" || raw === "emerald") return raw;
  if (raw === "violet") return "azure";
  if (raw === "sunset") return "crimson";
  return "crimson";
}

export function wrapStandardNote(note: NoteJSON): StoredPaymentPayload {
  return {kind: "standard", note};
}

export function createScratchGiftPayload(params: {
  note: NoteJSON;
  noteId?: string;
  amountLabel: string;
  tokenSymbol: string;
  recipientUsername?: string;
  meta: ScratchGiftMeta;
}): StoredScratchGiftPayload {
  const claim: ScratchClaimPayload = {
    kind: "scratch",
    note: params.note,
    noteId: params.noteId,
    amountLabel: params.amountLabel,
    tokenSymbol: params.tokenSymbol,
    recipientUsername: params.recipientUsername,
    meta: {
      ...params.meta,
      theme: normalizeTheme(params.meta.theme),
      title: params.meta.title.trim() || "Scratch & Win",
    },
  };
  return {kind: "scratch", note: params.note, claim};
}

export function parseStoredPaymentPayload(raw: string): StoredPaymentPayload {
  const parsed = JSON.parse(raw) as
    | NoteJSON
    | StoredScratchGiftPayload
    | {kind?: string; note?: NoteJSON};

  if (
    parsed &&
    typeof parsed === "object" &&
    "kind" in parsed &&
    parsed.kind === "scratch" &&
    parsed.note &&
    "claim" in parsed
  ) {
    const gift = parsed as StoredScratchGiftPayload;
    gift.claim.meta.theme = normalizeTheme(gift.claim.meta.theme);
    return gift;
  }

  return wrapStandardNote(parsed as NoteJSON);
}

export function encodeScratchClaimPayload(payload: ScratchClaimPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeScratchClaimPayload(
  encoded: string
): ScratchClaimPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as ScratchClaimPayload;
    if (parsed?.kind !== "scratch" || !parsed.note || !parsed.meta) return null;
    parsed.meta.theme = normalizeTheme(parsed.meta.theme);
    return parsed;
  } catch {
    return null;
  }
}

export function scratchClaimPath(encoded: string): string {
  return `/c?p=${encodeURIComponent(encoded)}`;
}
