import Fastify from "fastify";
import {authRoutes} from "./auth/auth.controller.js";
import {usersRoutes} from "./users/users.controller.js";
import {notesRoutes} from "./notes/notes.controller.js";

export async function buildApp() {
  const app = Fastify({logger: true});

  const origin = process.env.CORS_ORIGIN || "*";
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  app.get("/health", async () => ({ok: true, service: "bullet-backend"}));

  await authRoutes(app);
  await usersRoutes(app);
  await notesRoutes(app);

  return app;
}
