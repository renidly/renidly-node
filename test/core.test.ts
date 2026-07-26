import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  InsufficientCreditsError,
  InvalidRequestError,
  NotFoundError,
  RateLimitError,
  Renidly,
  RenidlyList,
  ServiceUnavailableError,
} from "../src/index.js";

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
function fail(status: number, message: string, error_code?: string, errors?: unknown) {
  return { success: false, statusCode: status, message, error_code, errors, data: null };
}
function seq(...responses: Response[]) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const f = (async (url: unknown, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return responses[Math.min(i++, responses.length - 1)];
  }) as unknown as typeof fetch;
  return Object.assign(f, { calls });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function client(f: typeof fetch, cfg: any = {}) {
  return new Renidly("k", { fetch: f, maxRetries: 0, backoffFactor: 0, ...cfg });
}

describe("errors", () => {
  it("maps 401 to AuthenticationError", async () => {
    await expect(client(seq(res(401, fail(401, "API key required")))).data.skills.retrieve("x")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("validation error carries fields and a rich message", async () => {
    const f = seq(res(400, fail(400, "Validation failed", "VALIDATION_ERROR", { title: "too short" })));
    try {
      await client(f).data.people.search({ title: "x" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRequestError);
      expect((e as InvalidRequestError).fieldErrors).toEqual({ title: "too short" });
      expect((e as Error).message).toContain("too short");
    }
  });

  it("maps 402/1080 to InsufficientCreditsError", async () => {
    await expect(
      client(seq(res(402, fail(402, "insufficient", "1080")))).emails.prospects("a.com", "full"),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("maps 429 to RateLimitError with metadata", async () => {
    const f = seq(res(429, fail(429, "slow", undefined, { current_tier: "Hobby", current_limit: 30 })));
    try {
      await client(f).data.skills.retrieve("x");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).tier).toBe("Hobby");
      expect((e as RateLimitError).limit).toBe(30);
    }
  });
});

describe("not-found behavior", () => {
  it("returns null by default, throws with throwOnNotFound", async () => {
    expect(await client(seq(res(200, fail(200, "not found", "1040")))).data.institutions.retrieve("nope")).toBeNull();
    await expect(
      client(seq(res(200, fail(200, "not found", "1040"))), { throwOnNotFound: true }).data.institutions.retrieve("nope"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("retries", () => {
  it("retries a 503 then succeeds", async () => {
    const f = seq(res(503, fail(503, "down", "1072")), res(200, ok({ name: "Python" })));
    const sk = await client(f, { maxRetries: 1 }).data.skills.retrieve("x");
    expect(sk?.name).toBe("Python");
    expect(f.calls.length).toBe(2);
  });

  it("gives up after retries", async () => {
    await expect(
      client(seq(res(503, fail(503, "down", "1072"))), { maxRetries: 1 }).data.skills.retrieve("x"),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe("pagination", () => {
  it("auto-pages across pages with for-await", async () => {
    const f = seq(
      res(200, ok([{ first_name: "a" }, { first_name: "b" }], { has_more: true, next_cursor: "c2" })),
      res(200, ok([{ first_name: "c" }], { has_more: false })),
    );
    const list = await client(f).data.people.search({ title: "cto" });
    expect(list).toBeInstanceOf(RenidlyList);
    const names: string[] = [];
    for await (const p of list) names.push(p.first_name);
    expect(names).toEqual(["a", "b", "c"]);
  });
});

describe("flags", () => {
  it("unwrapData:false returns the envelope", async () => {
    const resp = await client(seq(res(200, ok({ balance: 42 }))), { unwrapData: false }).account.balance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((resp as any).success).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((resp as any).data.balance).toBe(42);
  });

  it("attaches lastResponse", async () => {
    const t = await client(seq(res(200, ok({ balance: 1 }), { "x-request-id": "req_1" }))).account.balance();
    expect(t?.lastResponse.statusCode).toBe(200);
    expect(t?.lastResponse.requestId).toBe("req_1");
  });

  it("per-request apiKey override sets the header", async () => {
    const f = seq(res(200, ok({ name: "X" })));
    await client(f).data.skills.retrieve("x", { apiKey: "override" });
    expect((f.calls[0].init.headers as Record<string, string>)["X-renidly-apikey"]).toBe("override");
  });
});

describe("batch", () => {
  it("submits, polls, and collects results", async () => {
    const f = seq(
      res(202, ok({ job_id: "j1" })),
      res(200, ok({ status: "processing", total: 2, resolved: 1, next_cursor: 1, results: { "a@x.com": { email: "a@x.com", deliverable: true } } })),
      res(200, ok({ status: "completed", total: 2, resolved: 2, next_cursor: 2, results: { "b@y.com": { email: "b@y.com", deliverable: false } } })),
      res(200, ok({ status: "completed", total: 2, resolved: 2, next_cursor: 2, results: {} })),
    );
    const job = await client(f).emails.verifyBatch(["a@x.com", "b@y.com"]);
    const r = await job.wait({ pollInterval: 0 });
    expect(job.id).toBe("j1");
    expect(r.status).toBe("completed");
    expect(r.results.map((x) => x.email).sort()).toEqual(["a@x.com", "b@y.com"]);
  });
});

describe("rate limiter", () => {
  it("enterprise key requires a supplied limit", () => {
    expect(() => new Renidly("enterprise-x", { autoRateLimit: true })).toThrow();
  });
  it("enterprise fixed limit is accepted", () => {
    expect(() => new Renidly("enterprise-x", { autoRateLimit: true, rateLimitPerMinute: 550 })).not.toThrow();
  });
});
