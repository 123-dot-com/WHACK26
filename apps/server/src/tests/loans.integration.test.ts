import { randomUUID } from "node:crypto";
import type { ApiResponse, GameStateDTO } from "@bullish/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "./helpers/test-server.ts";

let server: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => { server = await startTestServer(); });
afterAll(async () => { await server?.stop(); });
async function request(path: string, body?: unknown, token?: string, key?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (key) headers["Idempotency-Key"] = key;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(server.baseUrl + "/api/games" + path, { method: body === undefined ? "GET" : "POST", headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() as ApiResponse<GameStateDTO & { accessToken?: string }> };
}
function state(result: Awaited<ReturnType<typeof request>>, status = 200) {
  expect(result.status).toBe(status);
  if (!result.body.success) throw new Error(JSON.stringify(result.body.error));
  return result.body.data;
}
async function game(open = true) {
  let current = state(await request("", {}), 201);
  const id = current.gameId, token = current.accessToken!;
  const send = async (action: string, payload: Record<string, unknown> = {}, key = randomUUID()) => {
    const result = await request(`/${id}/${action}`, { ...payload, expectedVersion: current.version }, token, key);
    if (result.body.success) current = result.body.data;
    return result;
  };
  if (open) state(await send("open-market"));
  return { id, token, send, current: () => current, load: async () => state(await request(`/${id}`, undefined, token)) };
}
async function close(g: Awaited<ReturnType<typeof game>>) {
  state(await g.send("prediction", { direction: "BULLISH" }));
  return state(await g.send("end-day"));
}
async function morning(g: Awaited<ReturnType<typeof game>>) {
  state(await g.send("next-day")); state(await g.send("open-market"));
}
const borrowPath = "bank/loans/borrow", repayPath = "bank/loans/repay";

describe("bank loans over HTTP and PostgreSQL", () => {
  it("persists a maximum loan without treating borrowed cash as profit", async () => {
    const g = await game();
    const result = state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    expect(result).toMatchObject({ wallet: { cashPence: 2_000_000 }, netWorthPence: 1_000_000,
      loan: { canBorrow: false, active: { principalPence: 1_000_000, balancePence: 1_000_000, repaymentPence: 1_050_000, borrowedDay: 1, dueDay: 2, overdue: false } } });
    expect(await g.load()).toEqual(result);
    expect(await server.prisma.loanEvent.count({ where: { gameId: g.id, type: "BORROW" } })).toBe(1);
    expect(await g.send(borrowPath, { amountPence: 100 })).toMatchObject({ status: 409, body: { error: { code: "ACTIVE_LOAN_EXISTS" } } });
  });
  it.each([0, -1, 1.5, 1_000_001, "10000"])("rejects invalid amount %s without mutation", async (amountPence) => {
    const g = await game(); const before = await g.load();
    expect((await g.send(borrowPath, { amountPence })).status).toBe(400);
    expect(await g.load()).toEqual(before);
  });
  it.each(["BRIEFING", "REPORT", "FINISHED"] as const)("blocks financial loan actions in %s", async (phase) => {
    const g = await game(); await server.prisma.gameSession.update({ where: { id: g.id }, data: { phase } });
    expect(await g.send(borrowPath, { amountPence: 100 })).toMatchObject({ status: 409, body: { error: { code: "INVALID_PHASE" } } });
    expect(await g.send(repayPath)).toMatchObject({ status: 409, body: { error: { code: "INVALID_PHASE" } } });
  });
  it("requires ownership, a key, current version, and server-selected loan terms", async () => {
    const g = await game(), other = await game(); const body = { amountPence: 100, expectedVersion: g.current().version };
    expect((await request(`/${g.id}/${borrowPath}`, body)).status).toBe(401);
    expect((await request(`/${g.id}/${borrowPath}`, body, other.token, randomUUID())).status).toBe(403);
    expect((await request(`/${g.id}/${borrowPath}`, body, g.token)).status).toBe(400);
    expect((await g.send(borrowPath, { amountPence: 100, dailyInterestBps: 0 })).status).toBe(400);
    state(await g.send(borrowPath, { amountPence: 100 }));
    expect(await request(`/${g.id}/${borrowPath}`, body, g.token, randomUUID())).toMatchObject({ status: 409, body: { error: { code: "VERSION_CONFLICT" } } });
    expect((await g.send(repayPath, { amountPence: 1 })).status).toBe(400);
  });
  it("replays concurrent identical borrows and rejects a key reused with another payload", async () => {
    const g = await game(), key = randomUUID(); const body = { amountPence: 1_000_000, expectedVersion: g.current().version };
    const [a, b] = await Promise.all([request(`/${g.id}/${borrowPath}`, body, g.token, key), request(`/${g.id}/${borrowPath}`, body, g.token, key)]);
    state(a); expect(b).toEqual(a);
    expect(await server.prisma.loan.count({ where: { gameId: g.id } })).toBe(1);
    expect(await request(`/${g.id}/${borrowPath}`, { ...body, amountPence: 100 }, g.token, key))
      .toMatchObject({ status: 409, body: { error: { code: "IDEMPOTENCY_CONFLICT" } } });
  });
  it("allows only one competing borrow and enforces one active loan at database level", async () => {
    const g = await game(); const body = { amountPence: 1_000_000, expectedVersion: g.current().version };
    const results = await Promise.all([request(`/${g.id}/${borrowPath}`, body, g.token, randomUUID()), request(`/${g.id}/${borrowPath}`, body, g.token, randomUUID())]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    await expect(server.prisma.loan.create({ data: { gameId: g.id, principalPence: 100, balancePence: 100, borrowedDay: 1, dueDay: 2, lastAccruedDay: 0 } })).rejects.toThrow();
  });
  it("charges 5% once, accepts 10,500 on Day 2, and allows another loan after timely repayment", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    state(await g.send("prediction", { direction: "BULLISH" }));
    const key = randomUUID(), payload = { expectedVersion: g.current().version };
    const result = await request(`/${g.id}/end-day`, payload, g.token, key); const first = state(result);
    expect(first.loan.active?.balancePence).toBe(1_050_000);
    expect(first.reports[0]).toMatchObject({ loanInterestPence: 50_000, loanBalancePence: 1_050_000, netWorthPence: 950_000 });
    expect(await request(`/${g.id}/end-day`, payload, g.token, key)).toEqual(result);
    expect(await server.prisma.loanEvent.count({ where: { gameId: g.id, type: "INTEREST" } })).toBe(1);
    // Synchronize fixture after a direct HTTP call.
    const next = state(await request(`/${g.id}/next-day`, { expectedVersion: first.version }, g.token, randomUUID()));
    const opened = state(await request(`/${g.id}/open-market`, { expectedVersion: next.version }, g.token, randomUUID()));
    const paid = state(await request(`/${g.id}/${repayPath}`, { expectedVersion: opened.version }, g.token, randomUUID()));
    expect(paid).toMatchObject({ netWorthPence: 950_000, wallet: { cashPence: 950_000 }, loan: { active: null, canBorrow: true } });
    const again = state(await request(`/${g.id}/${borrowPath}`, { amountPence: 100_000, expectedVersion: paid.version }, g.token, randomUUID()));
    expect(again.loan.active).toMatchObject({ borrowedDay: 2, dueDay: 3 });
  });
  it("compounds to 11,025 after a missed deadline and keeps borrowing locked after repayment", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    await close(g); await morning(g); const late = await close(g);
    expect(late.loan).toMatchObject({ lockedThroughDay: 3, active: { balancePence: 1_102_500, overdue: true } });
    expect(late.reports[1]).toMatchObject({ loanInterestPence: 52_500, loanBalancePence: 1_102_500, netWorthPence: 897_500 });
    await morning(g); const paid = state(await g.send(repayPath));
    expect(paid.loan).toMatchObject({ active: null, canBorrow: false, lockedThroughDay: 3 });
    const before = await g.load();
    expect(await g.send(borrowPath, { amountPence: 100 })).toMatchObject({ status: 422, body: { error: { code: "LOAN_LOCKED" } } });
    expect(await g.load()).toEqual(before);
  });
  it("keeps unpaid debt and all interest in final wealth, including loans due after Day 3", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    await close(g); await morning(g); await close(g); await morning(g); const finished = await close(g);
    expect(finished.loan.active?.balancePence).toBe(1_157_625);
    expect(finished.netWorthPence).toBe(842_375);
    expect(finished.reports.reduce((sum, report) => sum + (report.loanInterestPence ?? 0), 0)).toBe(157_625);
    const last = await game(); await close(last); await morning(last); await close(last); await morning(last);
    state(await last.send(borrowPath, { amountPence: 1_000_000 })); const end = await close(last);
    expect(end.loan.active).toMatchObject({ dueDay: 4, balancePence: 1_050_000 }); expect(end.netWorthPence).toBe(950_000);
  });
  it("rejects unaffordable repayment atomically and does not double-charge early repayment", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    state(await g.send("trades", { stockId: "NOVA", side: "BUY", quantity: 200 }));
    const before = await g.load();
    expect(await g.send(repayPath)).toMatchObject({ status: 422, body: { error: { code: "INSUFFICIENT_CASH" } } });
    expect(await g.load()).toEqual(before);
    const early = await game(); state(await early.send(borrowPath, { amountPence: 1_000_000 }));
    state(await early.send(repayPath)); const closed = await close(early);
    expect(closed.reports[0]).toMatchObject({ loanInterestPence: 50_000, loanBalancePence: 0, netWorthPence: 950_000 });
    expect(closed.netWorthPence).toBe(950_000);
  });
  it("replays duplicate repayments without deducting cash twice", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 }));
    await close(g); await morning(g);
    const key = randomUUID(), body = { expectedVersion: g.current().version };
    const [a, b] = await Promise.all([request(`/${g.id}/${repayPath}`, body, g.token, key), request(`/${g.id}/${repayPath}`, body, g.token, key)]);
    expect(state(a).wallet.cashPence).toBe(950_000); expect(b).toEqual(a);
    expect(await server.prisma.loanEvent.count({ where: { gameId: g.id, type: "REPAY" } })).toBe(1);
  });
  it("rolls back loan interest, penalty, lock and report when closing a day fails", async () => {
    const g = await game(); state(await g.send(borrowPath, { amountPence: 1_000_000 })); await close(g); await morning(g);
    state(await g.send("prediction", { direction: "BULLISH" })); const before = await g.load();
    await server.prisma.$executeRawUnsafe(`CREATE FUNCTION reject_loan_report() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
    await server.prisma.$executeRawUnsafe(`CREATE TRIGGER reject_loan_report BEFORE INSERT ON "DailyReport" FOR EACH ROW EXECUTE FUNCTION reject_loan_report()`);
    try { expect((await g.send("end-day")).status).toBe(500); expect(await g.load()).toEqual(before);
      expect(await server.prisma.loanEvent.count({ where: { gameId: g.id, type: "PENALTY" } })).toBe(0);
    } finally { await server.prisma.$executeRawUnsafe(`DROP TRIGGER reject_loan_report ON "DailyReport"`); await server.prisma.$executeRawUnsafe(`DROP FUNCTION reject_loan_report()`); }
    expect(state(await g.send("end-day")).loan.active?.balancePence).toBe(1_102_500);
  });
  it("resets debt, history and lock while making old request retries harmless", async () => {
    const g = await game(); const key = randomUUID(), body = { amountPence: 1_000_000, expectedVersion: g.current().version };
    state(await g.send(borrowPath, { amountPence: 1_000_000 }, key)); await close(g); await morning(g); await close(g);
    const reset = state(await g.send("reset"));
    expect(reset).toMatchObject({ day: 1, netWorthPence: 1_000_000, loan: { active: null, lockedThroughDay: 0 } });
    state(await request(`/${g.id}/${borrowPath}`, body, g.token, key));
    expect(await g.load()).toEqual(reset);
    expect(await server.prisma.loan.count({ where: { gameId: g.id } })).toBe(0);
    expect(await server.prisma.loanEvent.count({ where: { gameId: g.id } })).toBe(0);
  });
});
