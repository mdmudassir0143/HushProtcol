/**
 * Turn raw wallet / API / contract errors into short UI copy.
 * Keep messages factual. No marketing tone.
 */

const API_MESSAGES: Record<string, string> = {
  unauthorized: "Session expired. Sign in again.",
  session_expired: "Session expired. Sign in again at /register.",
  recipient_not_found: "Recipient not found. They need to claim a username first.",
  recipient_required: "Recipient username is required.",
  invalid_wallet: "That wallet address is not valid.",
  invalid_username:
    "Username must match your Twitter handle (1-15 chars: letters, numbers, underscore).",
  invalid_bullet_public_key: "Encryption key is invalid. Try reconnecting.",
  invalid_signature: "Signature format is invalid.",
  bad_signature: "Signature check failed. Sign the message again.",
  username_taken: "That username is already taken.",
  wallet_bound_to_other_username:
    "This wallet is already registered under a different username.",
  not_found: "Not found.",
  invalid_username_format: "Username format is invalid.",
  wallet_username_bulletPublicKey_required:
    "Missing wallet, username, or encryption key.",
  decrypt_failed: "Could not decrypt this note with the connected wallet.",
  http_400: "Request was rejected.",
  http_401: "Sign in required.",
  http_403: "You do not have access.",
  http_404: "Not found.",
  http_409: "Conflict with an existing account.",
  commitment_already_used:
    "This deposit commitment is already registered to another sender.",
  http_500: "Server error. Try again in a moment.",
  privy_not_configured: "Twitter linking is not configured on the server.",
  privy_token_required: "Privy session missing. Try Connect with Twitter again.",
  invalid_privy_token: "Twitter session expired. Connect with Twitter again.",
  twitter_not_linked_in_privy:
    "No Twitter account on this Privy session. Try again.",
  twitter_username_missing: "Twitter did not return a username.",
  twitter_already_linked:
    "That Twitter account is already linked to another wallet.",
};

const CONTRACT_HINTS: Array<{match: RegExp; message: string}> = [
  {
    match: /RootNotFound|root not found|unknown root/i,
    message:
      "Merkle root is not on-chain yet. Wait for the indexer to post a root, then retry.",
  },
  {
    match: /NullifierAlreadyUsed|nullifier already/i,
    message: "This note was already claimed.",
  },
  {
    match: /InvalidProof|invalid proof/i,
    message: "Proof was rejected by the contract. Try claiming again.",
  },
  {
    match: /InvalidRecipient|invalid recipient/i,
    message: "Recipient address is invalid.",
  },
  {
    match: /InvalidAmount|invalid amount/i,
    message: "Amount is invalid.",
  },
  {
    match: /InvalidToken|invalid token|unsupported token/i,
    message: "Token is not supported by the pool.",
  },
  {
    match: /insufficient (funds|allowance)|exceeds allowance|transfer amount exceeds/i,
    message: "Insufficient USDC balance or allowance.",
  },
  {
    match: /execution reverted/i,
    message: "Transaction reverted on Arc. Check balance, network, and try again.",
  },
];

function rawString(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const anyErr = err as Error & {
      shortMessage?: string;
      details?: string;
      cause?: unknown;
      walk?: () => Error;
    };
    // viem often puts the useful bit in shortMessage
    if (anyErr.shortMessage) return anyErr.shortMessage;
    if (typeof anyErr.details === "string" && anyErr.details) {
      return `${anyErr.message} ${anyErr.details}`;
    }
    return anyErr.message || String(err);
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as {message: unknown}).message);
  }
  return String(err);
}

function isUserRejection(text: string): boolean {
  return /user rejected|user denied|rejected the request|denied transaction signature|request rejected/i.test(
    text
  );
}

/** Human-readable error for banners and toasts. */
export function formatError(err: unknown, fallback = "Something went wrong."): string {
  const raw = rawString(err).trim();
  if (!raw) return fallback;

  if (isUserRejection(raw)) {
    return "Request cancelled in your wallet.";
  }

  // Exact API snake_case codes
  const code = raw.replace(/^error:\s*/i, "").trim();
  if (API_MESSAGES[code]) return API_MESSAGES[code];

  // http_404 style from our api helper
  const http = raw.match(/^http_(\d+)$/);
  if (http && API_MESSAGES[`http_${http[1]}`]) {
    return API_MESSAGES[`http_${http[1]}`];
  }

  for (const hint of CONTRACT_HINTS) {
    if (hint.match.test(raw)) return hint.message;
  }

  // Already clean product copy we throw ourselves
  if (
    /witness not ready|cannot reach indexer|connect (a |your )?wallet|sign in|username must|bound to a different wallet/i.test(
      raw
    )
  ) {
    // Collapse whitespace / strip trailing punctuation noise
    return raw.replace(/\s+/g, " ").trim();
  }

  // Strip viem / wagmi boilerplate wrappers
  let cleaned = raw
    .replace(/^ContractFunctionExecutionError:\s*/i, "")
    .replace(/^TransactionExecutionError:\s*/i, "")
    .replace(/^UserRejectedRequestError:\s*/i, "")
    .replace(/\nDocs:.*$/is, "")
    .replace(/\nVersion:.*$/is, "")
    .replace(/\nDetails:.*$/is, "")
    .replace(/\nContract Call:.*$/is, "")
    .replace(/\s+/g, " ")
    .trim();

  if (isUserRejection(cleaned)) {
    return "Request cancelled in your wallet.";
  }

  for (const hint of CONTRACT_HINTS) {
    if (hint.match.test(cleaned)) return hint.message;
  }

  // Truncate extremely long dumps
  if (cleaned.length > 180) {
    cleaned = cleaned.slice(0, 177).trimEnd() + "…";
  }

  return cleaned || fallback;
}

export function formatErrorTitle(err: unknown): string {
  const msg = formatError(err);
  if (msg.startsWith("Request cancelled")) return "Cancelled";
  if (/sign in|session expired|unauthorized/i.test(msg)) return "Sign in required";
  if (/network|wrong network|switch/i.test(msg)) return "Network";
  if (/witness|indexer|root/i.test(msg)) return "Not ready yet";
  if (/insufficient|allowance|balance/i.test(msg)) return "Funds";
  if (/taken|conflict|already/i.test(msg)) return "Conflict";
  return "Error";
}
