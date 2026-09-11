import nacl from "tweetnacl";

const KEY_PREFIX = "hush.keys.";

export interface HushKeypair {
  publicKey: `0x${string}`;
  secretKey: `0x${string}`;
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error("invalid_hex");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Get or create a durable X25519 keypair for this wallet (local only). */
export function getOrCreateHushKeys(wallet: string): HushKeypair {
  const key = KEY_PREFIX + wallet.toLowerCase();
  const existing = localStorage.getItem(key);
  if (existing) {
    return JSON.parse(existing) as HushKeypair;
  }
  const kp = nacl.box.keyPair();
  const pair: HushKeypair = {
    publicKey: bytesToHex(kp.publicKey),
    secretKey: bytesToHex(kp.secretKey),
  };
  localStorage.setItem(key, JSON.stringify(pair));
  return pair;
}

export function sealPayload(
  plaintext: string,
  recipientPublicKey: string
): string {
  const ephem = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = new TextEncoder().encode(plaintext);
  const boxed = nacl.box(
    message,
    nonce,
    hexToBytes(recipientPublicKey),
    ephem.secretKey
  );
  if (!boxed) throw new Error("seal_failed");
  const packed = {
    v: 1,
    ephemPublicKey: bytesToHex(ephem.publicKey),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(boxed),
  };
  return btoa(JSON.stringify(packed));
}

export function openPayload(
  sealedB64: string,
  recipientSecretKey: string
): string {
  const packed = JSON.parse(atob(sealedB64)) as {
    ephemPublicKey: string;
    nonce: string;
    ciphertext: string;
  };
  const opened = nacl.box.open(
    hexToBytes(packed.ciphertext),
    hexToBytes(packed.nonce),
    hexToBytes(packed.ephemPublicKey),
    hexToBytes(recipientSecretKey)
  );
  if (!opened) throw new Error("decrypt_failed");
  return new TextDecoder().decode(opened);
}
