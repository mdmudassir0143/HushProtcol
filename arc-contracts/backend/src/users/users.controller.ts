import type {FastifyInstance} from "fastify";
import {getUserByUsername, getUserByWallet} from "./users.service.js";
import {
  linkTwitterToUser,
  unlinkTwitterFromUser,
} from "./twitter.service.js";
import {sendError} from "../auth/auth.controller.js";
import {requireAuth} from "../middleware/auth.js";

export async function usersRoutes(app: FastifyInstance) {
  /** Resolve wallet → username + bulletPublicKey (public). Register before :username. */
  app.get<{Params: {wallet: string}}>(
    "/users/wallet/:wallet",
    async (req, reply) => {
      try {
        return await getUserByWallet(req.params.wallet);
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /** Link Privy Twitter to the signed-in wallet user. */
  app.post<{Body: {privyAccessToken?: string}}>(
    "/users/me/twitter",
    {preHandler: requireAuth},
    async (req, reply) => {
      try {
        if (!req.user) return reply.code(401).send({error: "unauthorized"});
        return await linkTwitterToUser({
          userId: req.user.sub,
          privyAccessToken: req.body?.privyAccessToken || "",
        });
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /** Unlink Twitter from the signed-in user. */
  app.delete("/users/me/twitter", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await unlinkTwitterFromUser(req.user.sub);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** Resolve @username → wallet + bulletPublicKey (public). */
  app.get<{Params: {username: string}}>("/users/:username", async (req, reply) => {
    try {
      return await getUserByUsername(req.params.username);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
