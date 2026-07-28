import { describe, expect, it } from "vitest";
import { Renidly, RenidlyList } from "../src/index.js";

// ── helpers ──
function res(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ok(data: any, pagination?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = { success: true, statusCode: 200, message: "ok", errors: null, data };
  if (pagination) e.pagination = pagination;
  return e;
}
function seq(...responses: Response[]) {
  let i = 0;
  return (async () => responses[Math.min(i++, responses.length - 1)]) as unknown as typeof fetch;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function client(f: typeof fetch, cfg: any = {}) {
  return new Renidly("k", { fetch: f, maxRetries: 0, backoffFactor: 0, ...cfg });
}

const CREDIT = { "x-credits-consumed": "5", "x-credits-balance": "95", "x-request-id": "req_42" };

describe("meta", () => {
  it("exposes the full meta surface on a single result", async () => {
    const p = await client(seq(res(200, ok({ first_name: "Ada" }), CREDIT))).data.people.retrieve({ id: "prsn_x" });
    expect(p).not.toBeNull();
    const m = p!.meta;
    expect(m.statusCode).toBe(200);
    expect(m.creditConsumed).toBe(5);
    expect(m.remainingBalance).toBe(95);
    expect(m.requestId).toBe("req_42");
    expect(m.headers["x-credits-consumed"]).toBe("5");
    expect((m.body as { data: { first_name: string } }).data.first_name).toBe("Ada");
    expect(m.rawBody).toContain("Ada");
    expect(m.rawHttp).toBeInstanceOf(Response);
    // alias points at the same object
    expect(p!.lastResponse).toBe(p!.meta);
    // data untouched
    expect(p!.first_name).toBe("Ada");
  });

  it("credit fields are undefined when headers are absent", async () => {
    const p = await client(seq(res(200, ok({ x: 1 })))).data.people.retrieve({ id: "prsn_x" });
    expect(p!.meta.creditConsumed).toBeUndefined();
    expect(p!.meta.remainingBalance).toBeUndefined();
    expect(p!.meta.statusCode).toBe(200);
  });

  it("handles mixed-case and fractional headers", async () => {
    const p = await client(
      seq(res(200, ok({ x: 1 }), { "X-Credits-Consumed": "2", "X-Credits-Balance": "8.5" })),
    ).data.people.retrieve({ id: "prsn_x" });
    expect(p!.meta.creditConsumed).toBe(2);
    expect(p!.meta.remainingBalance).toBe(8.5);
  });

  it("meta is non-enumerable (does not leak into keys / JSON)", async () => {
    const p = await client(seq(res(200, ok({ first_name: "Ada" }), CREDIT))).data.people.retrieve({ id: "prsn_x" });
    expect(Object.keys(p!)).toEqual(["first_name"]);
    expect(JSON.parse(JSON.stringify(p))).toEqual({ first_name: "Ada" });
  });

  it("exposes meta on envelope mode", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: any = await client(seq(res(200, ok({ x: 1 }), CREDIT)), { unwrapData: false }).data.people.retrieve({
      id: "prsn_x",
    });
    expect(resp.success).toBe(true);
    expect(resp.meta.creditConsumed).toBe(5);
  });

  it("exposes meta on the list and its items", async () => {
    const lst = await client(
      seq(res(200, ok([{ first_name: "a" }, { first_name: "b" }], { has_more: false }), CREDIT)),
    ).data.people.search({ title: "cto" });
    expect(lst).toBeInstanceOf(RenidlyList);
    expect(lst.meta!.creditConsumed).toBe(5);
    expect(lst.lastResponse).toBe(lst.meta);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((lst.data[0] as any).meta.creditConsumed).toBe(5);
  });

  it("carries per-page meta across auto-paging", async () => {
    const f = seq(
      res(200, ok([{ first_name: "a" }], { has_more: true, next_cursor: "c2" }), {
        "x-credits-consumed": "1",
        "x-credits-balance": "99",
      }),
      res(200, ok([{ first_name: "b" }], { has_more: false }), {
        "x-credits-consumed": "1",
        "x-credits-balance": "98",
      }),
    );
    const balances: (number | undefined)[] = [];
    for await (const item of client(f).data.people.search({ title: "cto" })) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      balances.push((item as any).meta.remainingBalance);
    }
    expect(balances).toEqual([99, 98]);
  });
});
