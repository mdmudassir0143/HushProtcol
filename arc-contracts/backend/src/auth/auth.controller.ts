import type {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {authMessage, walletAuth, type WalletAuthBody} from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{Body: WalletAuthBody}>("/auth/wallet", async (req, reply) => {
    try {
      return await walletAuth(req.body ?? ({} as WalletAuthBody));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get(
    "/auth/message",
    async (
      req: FastifyRequest<{
        Querystring: {wallet?: string; username?: string; bulletPublicKey?: string};
      }>,
      reply
    ) => {
      const {wallet, username, bulletPublicKey} = req.query;
      if (!wallet || !username || !bulletPublicKey) {
        return reply
          .code(400)
          .send({error: "wallet_username_bulletPublicKey_required"});
      }
      return {
        message: authMessage({
          wallet,
          username: username.replace(/^@/, ""),
          bulletPublicKey,
        }),
      };
    }
  );
}

export function sendError(reply: FastifyReply, err: unknown) {
  const e = err as {statusCode?: number; message?: string};
  return reply.code(e.statusCode ?? 500).send({error: e.message || "error"});
}
