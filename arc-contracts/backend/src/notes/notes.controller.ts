import type {FastifyInstance} from "fastify";
import {requireAuth} from "../middleware/auth.js";
import {sendError} from "../auth/auth.controller.js";
import {
  createNote,
  listNoteHistory,
  listNotesForUser,
  markClaimed,
  type NoteDirection,
} from "./notes.service.js";

export async function notesRoutes(app: FastifyInstance) {
  /** Create an encrypted note for a recipient (auth required). */
  app.post<{
    Body: {
      recipientUsername?: string;
      recipientId?: string;
      commitment: string;
      encryptedPayload: string;
      depositTxHash?: string;
      amount?: string;
      tokenSymbol?: string;
    };
  }>("/notes", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await createNote({
        senderUserId: req.user.sub,
        recipientUsername: req.body?.recipientUsername,
        recipientId: req.body?.recipientId,
        commitment: req.body?.commitment,
        encryptedPayload: req.body?.encryptedPayload,
        depositTxHash: req.body?.depositTxHash,
        amount: req.body?.amount,
        tokenSymbol: req.body?.tokenSymbol,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** Inbox: notes addressed to the authenticated user. */
  app.get("/notes", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await listNotesForUser(req.user.sub);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * Paginated send/receive history for the account page.
   * GET /notes/history?direction=sent|received&page=1&limit=5
   */
  app.get<{
    Querystring: {direction?: string; page?: string; limit?: string};
  }>("/notes/history", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      const directionRaw = (req.query.direction || "received").toLowerCase();
      const direction: NoteDirection =
        directionRaw === "sent" ? "sent" : "received";
      const page = Number(req.query.page || "1");
      const pageSize = Number(req.query.limit || "5");
      return await listNoteHistory({
        userId: req.user.sub,
        direction,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 5,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** Mark note claimed after successful on-chain withdraw. */
  app.patch<{
    Params: {id: string};
    Body: {txHash?: string};
  }>("/notes/:id/claim", {preHandler: requireAuth}, async (req, reply) => {
    try {
      if (!req.user) return reply.code(401).send({error: "unauthorized"});
      return await markClaimed(req.params.id, req.user.sub, req.body?.txHash);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
