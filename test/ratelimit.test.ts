import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter, limitFromTier } from "../src/ratelimit.js";

// Real /credits/tier/k/ payloads.
const TIERED = {
  balance: 0,
  current_tier: { name: "Testing", limit_per_minute: 7 },
  next_tier: { name: "Hobby", limit_per_minute: 30 },
};
const ENTERPRISE = { balance: 792626, limit_per_minute: 300, current_tier: null, next_tier: null, previous_tier: null };

describe("limitFromTier", () => {
  it("reads tiered and enterprise payloads", () => {
    expect(limitFromTier(TIERED)).toBe(7);
    expect(limitFromTier(ENTERPRISE)).toBe(300); // current_tier is null
    expect(limitFromTier({ current_tier: null })).toBeUndefined();
    expect(limitFromTier(undefined)).toBeUndefined();
  });
});

describe("RateLimiter", () => {
  it("applies the safety factor to a fixed limit", () => {
    expect(new RateLimiter({ fixedRpm: 600, safety: 0.9 }).currentRpm).toBe(540);
    expect(new RateLimiter({ fixedRpm: 30 }).currentRpm).toBe(30);
  });

  it.each([
    ["tiered", TIERED, 7],
    ["enterprise", ENTERPRISE, 300],
  ])("loads the %s limit from fetchRpm on first acquire", async (_label, payload, rpm) => {
    const rl = new RateLimiter({ fetchRpm: async () => limitFromTier(payload) });
    expect(rl.isLoaded).toBe(false);
    await rl.acquire();
    expect(rl.isLoaded).toBe(true);
    expect(rl.currentRpm).toBe(rpm);
  });

  it("warns once and does not throttle when the limit is unknown", async () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    let calls = 0;
    const rl = new RateLimiter({
      fetchRpm: async () => {
        calls++;
        return undefined;
      },
    });
    for (let i = 0; i < 20; i++) await rl.acquire(); // would block ~20 min at 1 rpm
    expect(rl.isLoaded).toBe(false);
    expect(calls).toBe(1); // not re-fetched on every request
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("warns and does not throttle when the tier lookup fails", async () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    const rl = new RateLimiter({
      fetchRpm: async () => {
        throw new Error("boom");
      },
    });
    await rl.acquire();
    await rl.acquire();
    expect(rl.isLoaded).toBe(false);
    expect(String(warn.mock.calls[0][0])).toContain("boom");
    warn.mockRestore();
  });

  it("shares one in-flight tier fetch across concurrent first calls", async () => {
    let calls = 0;
    const rl = new RateLimiter({
      fetchRpm: async () => {
        calls++;
        return 50;
      },
    });
    await Promise.all([rl.acquire(), rl.acquire(), rl.acquire()]);
    expect(calls).toBe(1);
    expect(rl.currentRpm).toBe(50);
  });

  it("re-fetches after onRateLimited()", async () => {
    let value = 60;
    const rl = new RateLimiter({ fetchRpm: async () => value });
    await rl.acquire();
    expect(rl.currentRpm).toBe(60);
    value = 90;
    rl.onRateLimited(); // forces a refresh next time
    await rl.acquire();
    expect(rl.currentRpm).toBe(90);
  });

  describe("sliding window", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("passes up to rpm immediately, then blocks until the window slides", async () => {
      const rl = new RateLimiter({ fixedRpm: 2 });
      await rl.acquire(); // t=0
      await rl.acquire(); // t=0, window full

      let released = false;
      const third = rl.acquire().then(() => (released = true));

      await vi.advanceTimersByTimeAsync(100);
      expect(released).toBe(false); // still blocked

      await vi.advanceTimersByTimeAsync(60_000); // oldest entry ages out
      await third;
      expect(released).toBe(true);
    });
  });
});
