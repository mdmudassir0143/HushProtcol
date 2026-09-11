import type {
  ApiError,
  AuthMessageResponse,
  ClaimNoteResponse,
  CreateNoteRequest,
  Note,
  NoteHistoryPage,
  PublicUser,
  WalletAuthRequest,
  WalletAuthResponse,
  WitnessResponse,
} from "@/shared";
import {BACKEND_URL, INDEXER_URL} from "./config";

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    throw new Error(body.error || `http_${res.status}`);
  }
  return body;
}

export async function getAuthMessage(params: {
  wallet: string;
  username: string;
  bulletPublicKey: string;
}): Promise<string> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${BACKEND_URL}/auth/message?${q}`);
  const data = await parseJson<AuthMessageResponse>(res);
  return data.message;
}

export async function walletAuth(
  body: WalletAuthRequest
): Promise<WalletAuthResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/wallet`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function resolveUser(username: string): Promise<PublicUser | null> {
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  const res = await fetch(`${BACKEND_URL}/users/${encodeURIComponent(clean)}`);
  if (res.status === 404) return null;
  return parseJson(res);
}

/** Lookup registered profile by connected wallet. */
export async function resolveUserByWallet(
  wallet: string
): Promise<PublicUser | null> {
  const res = await fetch(
    `${BACKEND_URL}/users/wallet/${encodeURIComponent(wallet)}`
  );
  if (res.status === 404) return null;
  return parseJson(res);
}

export async function postNote(
  token: string,
  body: CreateNoteRequest
): Promise<Note> {
  const res = await fetch(`${BACKEND_URL}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function listNotes(token: string): Promise<Note[]> {
  const res = await fetch(`${BACKEND_URL}/notes`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  return parseJson(res);
}

export async function listNoteHistory(
  token: string,
  opts: {
    direction: "sent" | "received";
    page?: number;
    limit?: number;
  }
): Promise<NoteHistoryPage> {
  const q = new URLSearchParams({
    direction: opts.direction,
    page: String(opts.page ?? 1),
    limit: String(opts.limit ?? 5),
  });
  const res = await fetch(`${BACKEND_URL}/notes/history?${q}`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  return parseJson(res);
}

export async function claimNote(
  token: string,
  noteId: string,
  txHash?: string
): Promise<ClaimNoteResponse> {
  const res = await fetch(`${BACKEND_URL}/notes/${noteId}/claim`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(txHash ? {txHash} : {}),
  });
  return parseJson(res);
}

export async function linkTwitter(
  token: string,
  body: {privyAccessToken: string}
): Promise<PublicUser> {
  const res = await fetch(`${BACKEND_URL}/users/me/twitter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function unlinkTwitter(token: string): Promise<PublicUser> {
  const res = await fetch(`${BACKEND_URL}/users/me/twitter`, {
    method: "DELETE",
    headers: {Authorization: `Bearer ${token}`},
  });
  return parseJson(res);
}

export async function fetchWitness(
  commitment: string
): Promise<WitnessResponse | null> {
  let res: Response;
  try {
    res = await fetch(
      `${INDEXER_URL}/witness/${encodeURIComponent(commitment)}`
    );
  } catch {
    throw new Error(
      `Cannot reach indexer at ${INDEXER_URL}. Run pnpm indexer:dev and check CORS.`
    );
  }
  if (res.status === 404) return null;
  return parseJson(res);
}

export async function indexerHealth(): Promise<{
  ok: boolean;
  lastBlock?: number;
  leaves?: number;
}> {
  try {
    const [healthRes, statsRes] = await Promise.all([
      fetch(`${INDEXER_URL}/health`),
      fetch(`${INDEXER_URL}/stats`),
    ]);
    if (!healthRes.ok) return {ok: false};
    const health = (await healthRes.json()) as {lastBlock?: number};
    const stats = statsRes.ok
      ? ((await statsRes.json()) as {leaves?: number})
      : {};
    return {ok: true, lastBlock: health.lastBlock, leaves: stats.leaves};
  } catch {
    return {ok: false};
  }
}

export async function backendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
