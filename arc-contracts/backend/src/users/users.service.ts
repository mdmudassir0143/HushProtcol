import {getAddress, isAddress} from "viem";
import {prisma} from "../db/prisma.js";
import {publicUser} from "../auth/auth.service.js";

export async function getUserByUsername(usernameRaw: string) {
  const username = usernameRaw.trim().toLowerCase().replace(/^@/, "");
  if (!username) {
    throw Object.assign(new Error("invalid_username"), {statusCode: 400});
  }
  const user = await prisma.user.findUnique({where: {username}});
  if (!user) {
    throw Object.assign(new Error("not_found"), {statusCode: 404});
  }
  return publicUser(user);
}

/** Lookup profile by connected wallet (public). */
export async function getUserByWallet(walletRaw: string) {
  if (!walletRaw || !isAddress(walletRaw)) {
    throw Object.assign(new Error("invalid_wallet"), {statusCode: 400});
  }
  const wallet = getAddress(walletRaw).toLowerCase();
  const user = await prisma.user.findUnique({where: {wallet}});
  if (!user) {
    throw Object.assign(new Error("not_found"), {statusCode: 404});
  }
  return publicUser(user);
}
