/** Paginator functions for the standard response envelopes. */
import { Paginator } from "./base.js";

/** Data-API cursor pagination (`pagination.next_cursor` / `has_more`). */
export const cursorPaginator: Paginator = (env, params) => {
  const items = (env.data as unknown[]) ?? [];
  const pag = (env.pagination as Record<string, unknown>) ?? {};
  const hasMore = Boolean(pag.has_more);
  const nc = (pag.next_cursor as string | undefined) ?? null;
  const next = hasMore && nc ? { ...params, cursor: nc } : null;
  return [items, hasMore, next, nc];
};

/** Data-API page pagination (`page = page + 1`). */
export const pagePaginator: Paginator = (env, params) => {
  const items = (env.data as unknown[]) ?? [];
  const pag = (env.pagination as Record<string, unknown>) ?? {};
  const hasMore = Boolean(pag.has_more);
  const page = Number(params.page ?? 1);
  const next = hasMore ? { ...params, page: page + 1 } : null;
  return [items, hasMore, next, null];
};

/** A non-paginated `data.<key>` array (returns everything in one page). */
export const collection =
  (key: string): Paginator =>
  (env) => {
    const data = (env.data as Record<string, unknown>) ?? {};
    return [(data[key] as unknown[]) ?? [], false, null, null];
  };
