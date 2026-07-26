import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "../src/ratelimit.js";

describe("RateLimiter", () => {
  it("applies the safety factor to a fixed limit", () => {
    expect(new RateLimiter({ fixedRpm: 600, safety: 0.9 }).currentRpm).toBe(540);
    expect(new RateLimiter({ fixedRpm: 30 }).currentRpm).toBe(30);
  });

  it("loads the limit from fetchRpm on first acquire", async () => {
    const rl = new RateLimiter({ fetchRpm: async () => 120 });
    expect(rl.currentRpm).toBe(1); // not loaded yet
    await rl.acquire();
    expect(rl.currentRpm).toBe(120);
  });

  it("falls back to 1 rpm when the tier lookup fails", async () => {
    const rl = new RateLimiter({
      fetchRpm: async () => {
        throw new Error("boom");
      },
    });
    await rl.acquire();
    expect(rl.currentRpm).toBe(1);
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
