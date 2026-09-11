/** Persisted wallet auth signatures so users skip MetaMask re-prompts. */

const SIG_KEY = "hush.authSig";

type SigMap = Record<string, `0x${string}`>;

function readMap(): SigMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SIG_KEY) || "{}") as SigMap;
  } catch {
    return {};
  }
}

function writeMap(map: SigMap) {
  localStorage.setItem(SIG_KEY, JSON.stringify(map));
}

export function getStoredAuthSignature(
  wallet: string
): `0x${string}` | null {
  const sig = readMap()[wallet.toLowerCase()];
  return sig?.startsWith("0x") ? sig : null;
}

export function setStoredAuthSignature(
  wallet: string,
  signature: `0x${string}`
) {
  const map = readMap();
  map[wallet.toLowerCase()] = signature;
  writeMap(map);
}

/** Clear one wallet, or all signatures if wallet omitted. */
export function clearStoredAuthSignature(wallet?: string) {
  if (typeof window === "undefined") return;
  if (!wallet) {
    localStorage.removeItem(SIG_KEY);
    return;
  }
  const map = readMap();
  delete map[wallet.toLowerCase()];
  if (Object.keys(map).length === 0) localStorage.removeItem(SIG_KEY);
  else writeMap(map);
}
