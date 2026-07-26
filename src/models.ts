/** HTTP metadata from the call that produced an object. */
export interface LastResponse {
  statusCode: number;
  headers: Record<string, string>;
  requestId?: string;
}

/**
 * A response object. JS objects are natively drill-able, so any field — nested
 * included — is accessible (`obj.a.b.c`). `lastResponse` carries the HTTP
 * metadata as a non-enumerable property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RenidlyObject = { [key: string]: any } & { readonly lastResponse: LastResponse };

/** The full shared envelope, returned when `unwrapData: false`. */
export interface APIResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  error_code?: string;
  errors?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  readonly lastResponse: LastResponse;
}

/** Attach HTTP metadata to a response object without polluting its keys. */
export function attach<T extends object>(obj: T, last: LastResponse): T & { readonly lastResponse: LastResponse } {
  Object.defineProperty(obj, "lastResponse", { value: last, enumerable: false, configurable: true });
  return obj as T & { readonly lastResponse: LastResponse };
}
