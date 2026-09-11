import {MailIcon, XBrandIcon} from "@/components/icons";

export type RecipientKind = "twitter" | "email" | "unknown";

/** Classify a pay-to string as X handle vs email. */
export function detectRecipientKind(raw: string): RecipientKind {
  const v = raw.trim();
  if (!v) return "unknown";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
  // Typing an email mid-way: local@…
  if (/^[^\s@]+@[^\s@]*$/.test(v) && v.includes("@") && !v.startsWith("@")) {
    return "email";
  }
  return "twitter";
}

/** Normalize for API resolve (username without @, or full email). */
export function normalizeRecipient(
  raw: string,
  kind?: Exclude<RecipientKind, "unknown">
): string {
  const v = raw.trim();
  const k = kind ?? detectRecipientKind(v);
  if (k === "email") return v.toLowerCase();
  return v.replace(/^@/, "").toLowerCase();
}

export function formatRecipientLabel(
  raw: string,
  kind?: Exclude<RecipientKind, "unknown">
): string {
  const v = raw.trim();
  if (!v) return "";
  const k = kind ?? detectRecipientKind(v);
  if (k === "email") return v;
  return v.startsWith("@") ? v : `@${v}`;
}

export function RecipientKindIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: RecipientKind;
  className?: string;
}) {
  if (kind === "email") {
    return <MailIcon className={className} />;
  }
  if (kind === "twitter") {
    return <XBrandIcon className={className} />;
  }
  return null;
}
