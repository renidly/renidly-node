/**
 * Optional built-in client-side rate limiter (`autoRateLimit: true`).
 *
 * Regular keys: the per-minute limit is fetched from the tier endpoint and
 * refreshed. Enterprise keys have a fixed limit the caller must supply via
 * `rateLimitPerMinute`. A sliding 60-second window guarantees we never exceed
 * the limit. (No lock needed — JS is single-threaded and the window check is
 * synchronous.)
 */
import { ResolvedConfig, isEnterprise } from "./config.js";
import { Limiter, Transport } from "./transport.js";

class Window {
  rpm: number;
  private times: number[] = [];
  constructor(rpm: number) {
    this.rpm = Math.max(1, rpm);
  }
  check(now: number): number {
    while (this.times.length && now - this.times[0] >= 60_000) this.times.shift();
    if (this.times.length < this.rpm) {
      this.times.push(now);
      return 0;
    }
    return 60_000 - (now - this.times[0]);
  }
}

export class RateLimiter implements Limiter {
  private win: Window;
  private loaded: boolean;
  private lastRefresh = 0;

  constructor(
    private readonly opts: {
      fixedRpm?: number;
      fetchRpm?: () => Promise<number | undefined>;
      refresh?: number;
      safety?: number;
    },
  ) {
    const safety = opts.safety ?? 1;
    this.win = new Window(opts.fixedRpm ? Math.max(1, Math.floor(opts.fixedRpm * safety)) : 1);
    this.loaded = opts.fixedRpm !== undefined;
  }

  private async ensure(): Promise<void> {
    if (!this.opts.fetchRpm) return;
    const now = Date.now();
    if (!this.loaded || now - this.lastRefresh > (this.opts.refresh ?? 300_000)) {
      try {
        const rpm = await this.opts.fetchRpm();
        if (rpm) {
          this.win.rpm = Math.max(1, Math.floor(rpm * (this.opts.safety ?? 1)));
          this.loaded = true;
        }
      } catch {
        if (!this.loaded) this.win.rpm = 1;
      }
      this.lastRefresh = now;
    }
  }

  async acquire(): Promise<void> {
    await this.ensure();
    for (;;) {
      const wait = this.win.check(Date.now());
      if (wait <= 0) return;
      await new Promise((r) => setTimeout(r, Math.min(wait, 60_000)));
    }
  }

  onRateLimited(): void {
    this.lastRefresh = 0;
  }

  /** For tests / introspection. */
  get currentRpm(): number {
    return this.win.rpm;
  }
}

export function buildLimiter(cfg: ResolvedConfig, transport: Transport): RateLimiter | undefined {
  if (!cfg.autoRateLimit) return undefined;
  if (cfg.rateLimitPerMinute !== undefined) {
    return new RateLimiter({ fixedRpm: cfg.rateLimitPerMinute, safety: cfg.rateLimitSafety });
  }
  if (isEnterprise(cfg.apiKey)) {
    throw new Error(
      "autoRateLimit is on for an enterprise key, which has a fixed rate limit. Pass rateLimitPerMinute to the client.",
    );
  }
  const fetchRpm = async (): Promise<number | undefined> => {
    const r = await transport.request("GET", "account", "/credits/tier/k/", { applyRateLimit: false });
    if (r.error) throw r.error;
    const ct = (r.data?.current_tier ?? {}) as Record<string, unknown>;
    return ct.limit_per_minute as number | undefined;
  };
  return new RateLimiter({ fetchRpm, refresh: cfg.rateLimitRefresh, safety: cfg.rateLimitSafety });
}
