/**
 * Client configuration and the service routing table.
 *
 * The four products live under one host but different path prefixes, and the
 * Account product uses a *different* auth header (`X-AUTHAPI-Key`) — the SDK
 * hides that entirely.
 */
export const DEFAULT_BASE_URL = "https://renidly.com";

export const SERVICES = {
  data: { prefix: "/api/data/v1", header: "X-renidly-apikey" },
  live: { prefix: "/api/v2", header: "X-renidly-apikey" },
  emails: { prefix: "/api/emails/v1", header: "X-renidly-apikey" },
  account: { prefix: "/api/panel", header: "X-AUTHAPI-Key" },
} as const;

export type Service = keyof typeof SERVICES;

/** Every option is optional and has a sensible default. */
export interface RenidlyConfig {
  /** API key. Falls back to the `RENIDLY_API_KEY` env var (Node). */
  apiKey?: string;
  /** Per-request timeout in milliseconds. Default `30000`. */
  timeout?: number;
  /** Auto-retries on 429 / 503 / network errors (backoff + jitter). Default `2`. */
  maxRetries?: number;
  /** Base milliseconds for the exponential backoff. Default `500`. */
  backoffFactor?: number;
  /** Override the API host. */
  baseUrl?: string;
  /** Extra headers on every request. */
  defaultHeaders?: Record<string, string>;
  /** Bring your own `fetch` implementation. */
  fetch?: typeof fetch;
  /** Return the unwrapped `data`. If `false`, return the full envelope. Default `true`. */
  unwrapData?: boolean;
  /** Single lookups throw `NotFoundError` instead of returning `null` when empty. Default `false`. */
  throwOnNotFound?: boolean;
  /** Map `success:false` responses to typed errors. Default `true`. */
  throwOnApiError?: boolean;
  /** Throttle requests to your per-minute limit automatically. Default `false`. */
  autoRateLimit?: boolean;
  /** Fixed per-minute limit. REQUIRED for enterprise keys; optional override otherwise. */
  rateLimitPerMinute?: number;
  /** Fraction of the limit to target (e.g. `0.9` leaves headroom). Default `1.0`. */
  rateLimitSafety?: number;
  /** Milliseconds between tier re-fetches for auto-fetched limits. Default `300000`. */
  rateLimitRefresh?: number;
}

export interface ResolvedConfig {
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  backoffFactor: number;
  baseUrl: string;
  defaultHeaders: Record<string, string>;
  fetch: typeof fetch;
  unwrapData: boolean;
  throwOnNotFound: boolean;
  throwOnApiError: boolean;
  autoRateLimit: boolean;
  rateLimitPerMinute?: number;
  rateLimitSafety: number;
  rateLimitRefresh: number;
}

function envApiKey(): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.RENIDLY_API_KEY : undefined;
  } catch {
    return undefined;
  }
}

export function resolveConfig(apiKey?: string, c: RenidlyConfig = {}): ResolvedConfig {
  return {
    apiKey: apiKey ?? c.apiKey ?? envApiKey(),
    timeout: c.timeout ?? 30_000,
    maxRetries: c.maxRetries ?? 2,
    backoffFactor: c.backoffFactor ?? 500,
    baseUrl: (c.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    defaultHeaders: c.defaultHeaders ?? {},
    fetch: c.fetch ?? globalThis.fetch.bind(globalThis),
    unwrapData: c.unwrapData ?? true,
    throwOnNotFound: c.throwOnNotFound ?? false,
    throwOnApiError: c.throwOnApiError ?? true,
    autoRateLimit: c.autoRateLimit ?? false,
    rateLimitPerMinute: c.rateLimitPerMinute,
    rateLimitSafety: c.rateLimitSafety ?? 1.0,
    rateLimitRefresh: c.rateLimitRefresh ?? 300_000,
  };
}

export function urlFor(cfg: ResolvedConfig, service: Service, path: string): string {
  return `${cfg.baseUrl}${SERVICES[service].prefix}${path}`;
}

export function authHeaderFor(service: Service): string {
  return SERVICES[service].header;
}

export function isEnterprise(apiKey: string | undefined): boolean {
  return !!apiKey && apiKey.startsWith("enterprise-");
}
