/**
 * Optional built-in client-side rate limiter (`autoRateLimit: true`).
 *
 * The per-minute limit is fetched from the tier endpoint for every key type:
 * tiered accounts report it on `current_tier` (it moves as the balance crosses
 * tier boundaries, so it is refreshed periodically and re-fetched after a 429);
 * enterprise accounts report a fixed top-level `limit_per_minute`.
 * `rateLimitPerMinute` overrides the fetched value.
 *
 * If the limit can't be determined, a warning is emitted once and requests are
 * not throttled client-side until a later refresh succeeds — server 429s are
 * still retried by the transport. A sliding 60-second window guarantees we
 * never exceed the limit once it is known. (No lock needed for the window — JS
 * is single-threaded and the check is synchronous; concurrent first calls share
 * one in-flight tier fetch.)
 */
import { ResolvedConfig } from "./config.js";
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

/**
 * Per-minute limit from a `/credits/tier/k/` payload. Enterprise accounts carry
 * a fixed top-level `limit_per_minute` (and a null `current_tier`); tiered
 * accounts carry it on `current_tier`.
 */
export function limitFromTier(data: unknown): number | undefined {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const tier = (d.current_tier && typeof d.current_tier === "object" ? d.current_tier : {}) as Record<string, unknown>;
  const limit = d.limit_per_minute ?? tier.limit_per_minute;
  return typeof limit === "number" && limit > 0 ? limit : undefined;
}

export class RateLimiter implements Limiter {
  private win: Window;
  private loaded: boolean;
  private lastRefresh: number | undefined; // undefined → fetch on next acquire
  private warned = false;
  private inflight: Promise<void> | undefined;

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

  private ensure(): Promise<void> {
    if (!this.opts.fetchRpm) return Promise.resolve();
    if (this.inflight) return this.inflight;
    const now = Date.now();
    if (this.lastRefresh !== undefined && now - this.lastRefresh <= (this.opts.refresh ?? 300_000)) {
      return Promise.resolve();
    }
    this.lastRefresh = now;
    this.inflight = this.refresh().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  private async refresh(): Promise<void> {
    let rpm: number | undefined;
    let error: unknown;
    try {
      rpm = await this.opts.fetchRpm!();
    } catch (e) {
      error = e;
    }
    if (rpm) {
      this.win.rpm = Math.max(1, Math.floor(rpm * (this.opts.safety ?? 1)));
      this.loaded = true;
    } else if (!this.loaded && !this.warned) {
      this.warned = true;
      const reason = error ? `tier lookup failed: ${(error as Error).message ?? error}` : "tier response has no limit_per_minute";
      process.emitWarning(
        `renidly: could not determine your per-minute rate limit (${reason}); client-side rate limiting is paused ` +
          "until the next refresh. Server 429s are still retried. Pass rateLimitPerMinute to set it explicitly.",
        "RenidlyRateLimitWarning",
      );
    }
  }

  async acquire(): Promise<void> {
    await this.ensure();
    if (!this.loaded) return;
    for (;;) {
      const wait = this.win.check(Date.now());
      if (wait <= 0) return;
      await new Promise((r) => setTimeout(r, Math.min(wait, 60_000)));
    }
  }

  onRateLimited(): void {
    this.lastRefresh = undefined;
  }

  /** For tests / introspection. */
  get currentRpm(): number {
    return this.win.rpm;
  }

  /** Whether a limit is known (fixed or fetched). */
  get isLoaded(): boolean {
    return this.loaded;
  }
}

export function buildLimiter(cfg: ResolvedConfig, transport: Transport): RateLimiter | undefined {
  if (!cfg.autoRateLimit) return undefined;
  if (cfg.rateLimitPerMinute !== undefined) {
    return new RateLimiter({ fixedRpm: cfg.rateLimitPerMinute, safety: cfg.rateLimitSafety });
  }
  const fetchRpm = async (): Promise<number | undefined> => {
    const r = await transport.request("GET", "account", "/credits/tier/k/", { applyRateLimit: false });
    if (r.error) throw r.error;
    return limitFromTier(r.data);
  };
  return new RateLimiter({ fetchRpm, refresh: cfg.rateLimitRefresh, safety: cfg.rateLimitSafety });
}
