import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => { server = await startTestServer(); });
afterAll(async () => { await server?.stop(); });

describe("database readiness over HTTP", () => {
  it("is ready when the schema and stock catalog are initialized", async () => {
    const response = await fetch(server.baseUrl + "/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true, data: { status: "ok", database: "connected" },
    });
  });

  it("rejects an incomplete seed while keeping liveness available", async () => {
    const stock = await server.prisma.stock.delete({ where: { id: "NOVA" } });
    try {
      const response = await fetch(server.baseUrl + "/api/health");
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        success: false, error: { code: "NOT_READY" },
      });
      expect((await fetch(server.baseUrl + "/api/health/live")).status).toBe(200);
    } finally {
      await server.prisma.stock.create({ data: stock });
    }
  });

  it("does not report ready when the stock table is missing", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    // This suite owns an isolated temporary database, removed by the helper.
    await server.prisma.$executeRaw`ALTER TABLE "Stock" RENAME TO "Stock_readiness_test"`;
    try {
      const response = await fetch(server.baseUrl + "/api/health");
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(await response.json()).toMatchObject({ success: false });
    } finally {
      try {
        await server.prisma.$executeRaw`ALTER TABLE "Stock_readiness_test" RENAME TO "Stock"`;
      } finally {
        errorLog.mockRestore();
      }
    }
  });
});
