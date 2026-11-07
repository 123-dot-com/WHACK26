import "dotenv/config";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export async function startTestServer() {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    throw new Error("Set DATABASE_URL before running server tests; see .env.example.");
  }

  const databaseName = `bullish_test_prediction_${randomBytes(8).toString("hex")}`;
  const testUrl = new URL(originalUrl);
  testUrl.pathname = `/${databaseName}`;

  const admin = new Client({ connectionString: originalUrl });
  await admin.connect();

  let created = false;
  let server: Server | undefined;
  let prisma: typeof import("../../lib/prisma.ts").prisma | undefined;

  async function stop() {
    try {
      if (server) {
        const running = server;
        server = undefined;
        await new Promise<void>((resolve, reject) => {
          running.close((error) => error ? reject(error) : resolve());
          running.closeAllConnections();
        });
      }

      await prisma?.$disconnect();

      if (created) {
        if (!/^bullish_test_prediction_[a-f0-9]{16}$/.test(databaseName)) {
          throw new Error("Refusing to drop an unexpected test database.");
        }
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
        created = false;
      }
    } finally {
      try {
        await admin.end();
      } finally {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  }

  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;

    // Set the test URL before importing any module that creates a Prisma client.
    process.env.DATABASE_URL = testUrl.toString();

    const require = createRequire(import.meta.url);
    const cli = join(dirname(require.resolve("prisma/package.json")), "build/index.js");
    execFileSync(process.execPath, [cli, "migrate", "deploy"], {
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      env: process.env,
      stdio: "pipe",
      timeout: 30_000,
      windowsHide: true,
    });

    const { prisma: testPrisma } = await import("../../lib/prisma.ts");
    prisma = testPrisma;
    await testPrisma.stock.createMany({
      data: [
        { id: "NOVA", name: "Nova AI", sector: "TECH", volatility: 1.2, initialPricePence: 10000 },
        { id: "GREEN", name: "GreenGrid Energy", sector: "ENERGY", volatility: 0.8, initialPricePence: 5000 },
        { id: "FINX", name: "FinX Bank", sector: "FINANCE", volatility: 1, initialPricePence: 7500 },
      ],
    });

    const { app } = await import("../../app.ts");
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind a TCP port.");
    }

    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      prisma: testPrisma,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
