import {tokenHash} from "@bullet/sdk";

/** Bind a payment to the recipient's Arc wallet (uint160 → Fr). */
export function recipientDigestForWallet(wallet: string) {
  return tokenHash(wallet);
}
