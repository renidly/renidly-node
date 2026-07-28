/**
 * HTTP metadata for the response that produced an object: status code, raw
 * headers, request id, credit accounting, the parsed body envelope, the raw
 * response text, and `rawHttp` — the underlying fetch `Response` for anything
 * not surfaced here (`.url`, `.redirected`, `.type`, …). Note its body stream is
 * already consumed; use `body` / `rawBody` for the payload.
 */
export interface ResponseMeta {
  statusCode: number;
  headers: Record<string, string>;
  requestId?: string;
  /** Credits charged for this request; `undefined` if not credit-billed. */
  creditConsumed?: number;
  /** Credit balance remaining after this request; `undefined` if not credit-billed. */
  remainingBalance?: number;
  /** Parsed JSON envelope. */
  body?: unknown;
  /** Raw response text. */
  rawBody?: string;
  /** The underlying fetch `Response` (body stream already consumed). */
  rawHttp?: Response;
}

/** Deprecated alias for {@link ResponseMeta}. */
export type LastResponse = ResponseMeta;

/**
 * A response object. JS objects are natively drill-able, so any field — nested
 * included — is accessible (`obj.a.b.c`). `meta` (and its `lastResponse` alias)
 * carries the HTTP metadata as a non-enumerable property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RenidlyObject = { [key: string]: any } & {
  readonly meta: ResponseMeta;
  /** Deprecated alias for `meta`. */
  readonly lastResponse: ResponseMeta;
};

/** The full shared envelope, returned when `unwrapData: false`. */
export interface APIResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  error_code?: string;
  errors?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  readonly meta: ResponseMeta;
  /** Deprecated alias for `meta`. */
  readonly lastResponse: ResponseMeta;
}

export const CONSUMED_HEADER = "x-credits-consumed";
export const BALANCE_HEADER = "x-credits-balance";

/** Parse a numeric `X-Credits-*` header off a response, case-insensitively.
 * Returns `undefined` when there is no response or the header is absent. */
export function creditHeader(headers: Record<string, string> | undefined, name: string): number | undefined {
  if (!headers) return undefined;
  let raw = headers[name];
  if (raw === undefined) {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === name) {
        raw = v;
        break;
      }
    }
  }
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** Attach HTTP metadata to a response object without polluting its keys.
 * Exposes both `meta` and the `lastResponse` alias, non-enumerably. */
export function attach<T extends object>(
  obj: T,
  meta: ResponseMeta,
): T & { readonly meta: ResponseMeta; readonly lastResponse: ResponseMeta } {
  Object.defineProperty(obj, "meta", { value: meta, enumerable: false, configurable: true });
  Object.defineProperty(obj, "lastResponse", { value: meta, enumerable: false, configurable: true });
  return obj as T & { readonly meta: ResponseMeta; readonly lastResponse: ResponseMeta };
}
