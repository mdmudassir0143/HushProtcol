import {verifyMessage, isAddress, getAddress} from "viem";
import {SignJWT, jwtVerify} from "jose";
import {prisma} from "../db/prisma.js";

const USERNAME_RE = /^[a-z0-9_]{1,15}$/;
const KEY_RE = /^(0x)?[0-9a-fA-F]{64}$/;

const jwtSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || "change-me-bullet-hackathon-secret"
  );
const jwtTtlHours = () => Number(process.env.JWT_TTL_HOURS || "72");

export interface AuthTokenPayload {
  sub: string;
  wallet: string;
  username: string;
}

export interface WalletAuthBody {
  wallet: string;
  username: string;
  bulletPublicKey: string;
  signature: `0x${string}`;
}

/** Canonical message the wallet must personal_sign. */
export function authMessage(params: {
  wallet: string;
  username: string;
  bulletPublicKey: string;
}): string {
  const wallet = params.wallet.toLowerCase();
  const username = params.username.toLowerCase().replace(/^@/, "");
  const bulletPublicKey = normalizeKey(params.bulletPublicKey).toLowerCase();
  return [
    "Bullet Auth",
    `Wallet: ${wallet}`,
    `Username: ${username}`,
    `BulletKey: ${bulletPublicKey}`,
  ].join("\n");
}

export async function signToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({
    wallet: payload.wallet,
    username: payload.username,
  })
    .setProtectedHeader({alg: "HS256"})
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${jwtTtlHours()}h`)
    .sign(jwtSecret());
}

export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  const {payload} = await jwtVerify(token, jwtSecret());
  if (!payload.sub || typeof payload.wallet !== "string") {
    throw new Error("invalid_token");
  }
  return {
    sub: payload.sub,
    wallet: payload.wallet,
    username: String(payload.username || ""),
  };
}

export async function walletAuth(body: WalletAuthBody) {
  const walletRaw = body.wallet?.trim();
  const username = body.username?.trim().toLowerCase().replace(/^@/, "");
  const bulletPublicKey = normalizeKey(body.bulletPublicKey);
  const signature = body.signature;

  if (!walletRaw || !isAddress(walletRaw)) {
    throw httpError(400, "invalid_wallet");
  }
  if (!username || !USERNAME_RE.test(username)) {
    throw httpError(400, "invalid_username");
  }
  if (!bulletPublicKey || !KEY_RE.test(bulletPublicKey)) {
    throw httpError(400, "invalid_bullet_public_key");
  }
  if (!signature?.startsWith("0x")) {
    throw httpError(400, "invalid_signature");
  }

  const wallet = getAddress(walletRaw);
  const message = authMessage({wallet, username, bulletPublicKey});

  const ok = await verifyMessage({
    address: wallet,
    message,
    signature,
  });
  if (!ok) throw httpError(401, "bad_signature");

  const byWallet = await prisma.user.findUnique({
    where: {wallet: wallet.toLowerCase()},
  });
  const byUsername = await prisma.user.findUnique({where: {username}});

  if (byUsername && byUsername.wallet !== wallet.toLowerCase()) {
    throw httpError(409, "username_taken");
  }
  if (byWallet && byWallet.username !== username) {
    throw httpError(409, "wallet_bound_to_other_username");
  }

  const user = await prisma.user.upsert({
    where: {wallet: wallet.toLowerCase()},
    create: {
      wallet: wallet.toLowerCase(),
      username,
      bulletPublicKey: bulletPublicKey.toLowerCase(),
    },
    update: {
      bulletPublicKey: bulletPublicKey.toLowerCase(),
    },
  });

  const token = await signToken({
    sub: user.id,
    wallet: user.wallet,
    username: user.username,
  });

  return {token, user: publicUser(user), message};
}

export function publicUser(user: {
  id: string;
  wallet: string;
  username: string;
  bulletPublicKey: string;
  twitterUsername?: string | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    wallet: user.wallet,
    username: user.username,
    bulletPublicKey: user.bulletPublicKey,
    twitterUsername: user.twitterUsername ?? null,
    createdAt: user.createdAt,
  };
}

function normalizeKey(key: string | undefined): string {
  if (!key) return "";
  const k = key.trim();
  return k.startsWith("0x") ? k : `0x${k}`;
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), {statusCode});
}
