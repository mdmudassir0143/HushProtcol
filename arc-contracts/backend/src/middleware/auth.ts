import type {FastifyReply, FastifyRequest} from "fastify";
import {verifyToken, type AuthTokenPayload} from "../auth/auth.service.js";
import {prisma} from "../db/prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthTokenPayload;
  }
}

/** Requires `Authorization: Bearer <jwt>` from POST /auth/wallet. */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({error: "unauthorized"});
  }
  try {
    const claims = await verifyToken(header.slice(7));
    // Reject JWTs whose user was deleted (e.g. after a DB wipe).
    const exists = await prisma.user.findUnique({
      where: {id: claims.sub},
      select: {id: true},
    });
    if (!exists) {
      return reply.code(401).send({error: "session_expired"});
    }
    req.user = claims;
  } catch {
    return reply.code(401).send({error: "unauthorized"});
  }
}
