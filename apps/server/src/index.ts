import { app } from "./app.ts";
import { env } from "./lib/env.ts";
import { prisma } from "./lib/prisma.ts";

const server = app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
