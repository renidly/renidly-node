/**
 * HTTP engine: request building, retries with backoff, envelope parsing, and
 * error mapping. Policy (unwrap, not-found→null, throw-on-error) lives in the
 * resource layer — this module only turns an HTTP exchange into a `Result`.
 */
import { ResolvedConfig, Service, authHeaderFor, urlFor } from "./config.js";
import {
  APIConnectionError,
  APIStatusError,
  AuthenticationError,
  InsufficientCreditsError,
  InternalServerError,
  InvalidRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  RenidlyError,
  ServiceUnavailableError,
} from "./errors.js";
import { LastResponse } from "./models.js";
import { version } from "./version.js";

const NOT_FOUND_CODES = new Set(["1010", "1020", "1030", "1040", "1090"]);
const USER_AGENT = `renidly-node/${version}`;

export interface RequestOptions {
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface Result {
  ok: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  envelope: Record<string, unknown>;
  lastResponse: LastResponse;
  error?: RenidlyError;
}

export interface Limiter {
  acquire(): Promise<void>;
  onRateLimited(): void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function requestId(headers: Record<string, string>): string | undefined {
  return headers["x-request-id"] ?? headers["x-renidly-request-id"];
}

function mapError(status: number, env: Record<string, unknown>, last: LastResponse): RenidlyError {
  const msg = (env.message as string) || `HTTP ${status}`;
  const code = env.error_code as string | undefined;
  const errors = env.errors && typeof env.errors === "object" ? (env.errors as Record<string, unknown>) : {};
  const opts = { status, errorCode: code, errors, requestId: last.requestId };
  const low = msg.toLowerCase();
  if (status === 402 || code === "1080" || low.includes("insufficient") || low.includes("enough credit"))
    return new InsufficientCreditsError(msg, opts);
  if (status === 429) return new RateLimitError(msg, opts);
  if (status === 503 || code === "1072") return new ServiceUnavailableError(msg, opts);
  if (status === 401) return new AuthenticationError(msg, opts);
  if ((code && NOT_FOUND_CODES.has(code)) || status === 404) return new NotFoundError(msg, opts);
  if (status === 400 || status === 422 || code === "VALIDATION_ERROR") return new InvalidRequestError(msg, opts);
  if (status === 403) {
    if (low.includes("invalid") && low.includes("key")) return new AuthenticationError(msg, opts);
    if (low.includes("credit")) return new InsufficientCreditsError(msg, opts);
    return new PermissionDeniedError(msg, opts);
  }
  if (status >= 500 || code === "1000" || code === "1001") return new InternalServerError(msg, opts);
  return new APIStatusError(msg, opts);
}

async function parse(resp: Response): Promise<Result> {
  const headers: Record<string, string> = {};
  resp.headers.forEach((v, k) => (headers[k] = v));
  const last: LastResponse = { statusCode: resp.status, headers, requestId: requestId(headers) };
  let env: Record<string, unknown>;
  try {
    const j = await resp.json();
    env = j && typeof j === "object" ? (j as Record<string, unknown>) : { success: resp.ok, data: j };
  } catch {
    env = { success: false, message: `HTTP ${resp.status}` };
  }
  const ok = (env.success ?? resp.ok) === true && resp.ok;
  if (ok) return { ok: true, data: env.data, envelope: env, lastResponse: last };
  return { ok: false, data: env.data, envelope: env, lastResponse: last, error: mapError(resp.status, env, last) };
}

function isRetryable(err: RenidlyError | undefined): boolean {
  return (
    err instanceof APIConnectionError ||
    err instanceof RateLimitError ||
    err instanceof ServiceUnavailableError
  );
}

function backoff(cfg: ResolvedConfig, attempt: number, err: RenidlyError | undefined): number {
  if (err instanceof RateLimitError && err.retryAfter) return err.retryAfter * 1000;
  return cfg.backoffFactor * 2 ** attempt + Math.random() * cfg.backoffFactor;
}

export interface RequestArgs {
  params?: Record<string, unknown>;
  body?: unknown;
  options?: RequestOptions;
  applyRateLimit?: boolean;
}

export class Transport {
  limiter?: Limiter;

  constructor(private cfg: ResolvedConfig) {}

  async request(method: string, service: Service, path: string, args: RequestArgs = {}): Promise<Result> {
    const url = new URL(urlFor(this.cfg, service, path));
    if (args.params) {
      for (const [k, v] of Object.entries(args.params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const apiKey = args.options?.apiKey ?? this.cfg.apiKey;
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...this.cfg.defaultHeaders,
    };
    if (apiKey) headers[authHeaderFor(service)] = apiKey;
    if (args.body !== undefined) headers["Content-Type"] = "application/json";
    Object.assign(headers, args.options?.headers ?? {});
    const timeout = args.options?.timeout ?? this.cfg.timeout;

    if ((args.applyRateLimit ?? true) && this.limiter) await this.limiter.acquire();

    let lastErr: RenidlyError | undefined;
    for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      let result: Result | undefined;
      try {
        const resp = await this.cfg.fetch(url.toString(), {
          method,
          headers,
          body: args.body !== undefined ? JSON.stringify(args.body) : undefined,
          signal: ctrl.signal,
        });
        result = await parse(resp);
      } catch (e) {
        lastErr = new APIConnectionError((e as Error)?.message || "connection error");
      } finally {
        clearTimeout(timer);
      }
      if (result) {
        if (result.ok || !isRetryable(result.error)) return result;
        lastErr = result.error;
        if (lastErr instanceof RateLimitError && this.limiter) this.limiter.onRateLimited();
      }
      if (attempt < this.cfg.maxRetries) {
        await sleep(backoff(this.cfg, attempt, lastErr));
        continue;
      }
      throw lastErr ?? new APIConnectionError("request failed");
    }
    throw lastErr ?? new APIConnectionError("request failed");
  }
}
