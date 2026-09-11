import {tokenHash} from "@bullet/sdk";
import type {Address} from "viem";

export type PoolToken = {
  address: Address;
  symbol: string;
  decimals: number;
  enabled: boolean;
  /** Public path to token logo (SVG/PNG). */
  logo: string;
};

/** Tokens enabled on BulletPool (from deployments/arcTestnet.json). */
export const POOL_TOKENS: readonly PoolToken[] = [
  {
    address: "0x7d7aF5715e5671e0E3126b2428Dc2629bD9061e3",
    symbol: "USDC",
    decimals: 6,
    enabled: true,
    logo: "/tokens/usdc.png",
  },
  {
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    symbol: "EURC",
    decimals: 6,
    enabled: true,
    logo: "/tokens/eurc.png",
  },
  {
    address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    symbol: "cirBTC",
    decimals: 8,
    enabled: true,
    logo: "/tokens/cirbtc.png",
  },
  {
    address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
    symbol: "USYC",
    decimals: 6,
    enabled: true,
    logo: "/tokens/usyc.png",
  },
] as const;

export const DEFAULT_POOL_TOKEN = POOL_TOKENS[0];

export function getPoolToken(addressOrSymbol: string): PoolToken | undefined {
  const q = addressOrSymbol.trim().toLowerCase();
  return POOL_TOKENS.find(
    (t) =>
      t.enabled &&
      (t.address.toLowerCase() === q || t.symbol.toLowerCase() === q)
  );
}

export function toTokenUnits(amount: number, decimals: number): bigint {
  const f = 10 ** decimals;
  return BigInt(Math.round(amount * f));
}

export function fromTokenUnits(
  raw: bigint | string,
  decimals: number
): string {
  const n = typeof raw === "bigint" ? raw : BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "")}`;
}

/** Resolve pool token from note metadata (symbol and/or Poseidon tokenHash). */
export function resolvePoolToken(opts: {
  tokenSymbol?: string | null;
  tokenHash?: string | bigint | null;
}): PoolToken {
  if (opts.tokenSymbol) {
    const bySymbol = getPoolToken(opts.tokenSymbol);
    if (bySymbol) return bySymbol;
  }
  if (opts.tokenHash != null && opts.tokenHash !== "") {
    const want = BigInt(opts.tokenHash);
    const byHash = POOL_TOKENS.find((t) => tokenHash(t.address) === want);
    if (byHash) return byHash;
  }
  return DEFAULT_POOL_TOKEN;
}
