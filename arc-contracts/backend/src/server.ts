import "dotenv/config";
import {buildApp} from "./app.js";
import {prisma} from "./db/prisma.js";

const port = Number(process.env.PORT || 4020);
const host = process.env.HOST || "0.0.0.0";

async function main() {
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({port, host});
  console.log(`[backend] listening on http://${host}:${port}`);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
