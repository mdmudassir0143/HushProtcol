import {PrivyClient} from "@privy-io/node";
import {prisma} from "../db/prisma.js";
import {publicUser} from "../auth/auth.service.js";

let privy: PrivyClient | null = null;

function getPrivy(): PrivyClient {
  if (privy) return privy;
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw Object.assign(new Error("privy_not_configured"), {statusCode: 503});
  }
  privy = new PrivyClient({appId, appSecret});
  return privy;
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), {statusCode});
}

/**
 * Verify Privy access token, read Twitter account, link to the signed-in user.
 */
export async function linkTwitterToUser(params: {
  userId: string;
  privyAccessToken: string;
}) {
  const token = params.privyAccessToken?.trim();
  if (!token) throw httpError(400, "privy_token_required");

  const client = getPrivy();
  let claims: {user_id: string};
  try {
    claims = await client.utils().auth().verifyAccessToken(token);
  } catch {
    throw httpError(401, "invalid_privy_token");
  }

  const privyUser = await client.users()._get(claims.user_id);
  const twitter = privyUser.linked_accounts?.find(
    (a) => a.type === "twitter_oauth"
  );
  if (!twitter || twitter.type !== "twitter_oauth") {
    throw httpError(400, "twitter_not_linked_in_privy");
  }

  const twitterUsername = (twitter.username || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!twitterUsername) {
    throw httpError(400, "twitter_username_missing");
  }

  const taken = await prisma.user.findFirst({
    where: {
      OR: [
        {twitterUsername},
        {twitterSubject: twitter.subject},
      ],
      NOT: {id: params.userId},
    },
  });
  if (taken) {
    throw httpError(409, "twitter_already_linked");
  }

  const user = await prisma.user.update({
    where: {id: params.userId},
    data: {
      twitterUsername,
      twitterSubject: twitter.subject,
      privyDid: claims.user_id,
    },
  });

  return publicUser(user);
}

export async function unlinkTwitterFromUser(userId: string) {
  const user = await prisma.user.update({
    where: {id: userId},
    data: {
      twitterUsername: null,
      twitterSubject: null,
      privyDid: null,
    },
  });
  return publicUser(user);
}
