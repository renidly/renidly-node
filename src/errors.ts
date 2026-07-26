/**
 * Typed error hierarchy, mapped from the shared response envelope.
 *
 * Every failed request throws a subclass of {@link RenidlyError}. The thrown
 * error's `message` includes the server's field-level detail, so an uncaught
 * error is self-explanatory; `serverMessage` keeps the clean top-line and
 * `errors` holds the `{field: reason}` detail.
 */
export interface RenidlyErrorOptions {
  status?: number;
  errorCode?: string;
  errors?: Record<string, unknown>;
  requestId?: string;
}

export class RenidlyError extends Error {
  /** The clean, top-level server message (e.g. "Validation failed"). */
  readonly serverMessage: string;
  readonly status?: number;
  readonly errorCode?: string;
  /** Field-level detail (`{field: reason}`) — the *why* behind the message. */
  readonly errors: Record<string, unknown>;
  readonly requestId?: string;

  constructor(message: string, opts: RenidlyErrorOptions = {}) {
    const errors = opts.errors ?? {};
    super(RenidlyError.buildMessage(message, opts.errorCode, opts.status, opts.requestId, errors));
    this.name = new.target.name;
    this.serverMessage = message;
    this.status = opts.status;
    this.errorCode = opts.errorCode;
    this.errors = errors;
    this.requestId = opts.requestId;
    Object.setPrototypeOf(this, new.target.prototype); // instanceof works after transpile
  }

  private static buildMessage(
    msg: string,
    code: string | undefined,
    status: number | undefined,
    reqId: string | undefined,
    errors: Record<string, unknown>,
  ): string {
    let detail = msg;
    const fields = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join("; ");
    if (fields) detail = `${detail} — ${fields}`;
    const meta: string[] = [];
    if (code) meta.push(String(code));
    if (status) meta.push(`HTTP ${status}`);
    if (reqId) meta.push(`request_id=${reqId}`);
    return meta.length ? `${detail} (${meta.join(", ")})` : detail;
  }
}

/** The request never reached the API (network failure, timeout, DNS…). */
export class APIConnectionError extends RenidlyError {}
/** The API returned a non-success response. Base of all HTTP-status errors. */
export class APIStatusError extends RenidlyError {}
/** Missing or invalid API key (HTTP 401 / 403). */
export class AuthenticationError extends APIStatusError {}
/** Key valid but not allowed here — premium-gated or opted-out (HTTP 403). */
export class PermissionDeniedError extends APIStatusError {}
/** Request failed validation (HTTP 400 / 422). See {@link fieldErrors}. */
export class InvalidRequestError extends APIStatusError {
  get fieldErrors(): Record<string, unknown> {
    return this.errors;
  }
}
/** Not enough credits for the request (HTTP 402 / 403). */
export class InsufficientCreditsError extends APIStatusError {}
/** A lookup resolved nothing, or a batch job was not found / expired. */
export class NotFoundError extends APIStatusError {}
/** Per-minute rate limit for your tier exceeded (HTTP 429). */
export class RateLimitError extends APIStatusError {
  readonly tier?: string;
  readonly limit?: number;
  readonly retryAfter?: number;
  constructor(message: string, opts: RenidlyErrorOptions = {}) {
    super(message, opts);
    const e = this.errors as Record<string, unknown>;
    this.tier = (e.current_tier ?? e.tier) as string | undefined;
    this.limit = (e.current_limit ?? e.limit) as number | undefined;
    this.retryAfter = e.retry_after as number | undefined;
  }
}
/** Temporarily unavailable — safe to retry shortly (HTTP 503). */
export class ServiceUnavailableError extends APIStatusError {}
/** Unexpected server error (HTTP 5xx). */
export class InternalServerError extends APIStatusError {}
