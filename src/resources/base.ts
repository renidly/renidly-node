/**
 * Resource base: translates a transport `Result` into the public return shape
 * according to the client's behavior flags (`unwrapData`, `throwOnNotFound`,
 * `throwOnApiError`). All methods are async.
 */
import { ResolvedConfig, Service } from "../config.js";
import { NotFoundError } from "../errors.js";
import { RenidlyObject, attach } from "../models.js";
import { RenidlyList, RenidlyListPromise, autoPagingPromise } from "../pagination.js";
import { RequestOptions, Result, Transport } from "../transport.js";

/** `(envelope, params) => [items, hasMore, nextParams, nextCursor]` */
export type Paginator = (
  env: Record<string, unknown>,
  params: Record<string, unknown>,
) => [unknown[], boolean, Record<string, unknown> | null, string | null];

export class BaseResource {
  constructor(
    protected readonly transport: Transport,
    protected readonly cfg: ResolvedConfig,
  ) {}

  protected async one(
    service: Service,
    method: string,
    path: string,
    args: { params?: Record<string, unknown>; body?: unknown; options?: RequestOptions } = {},
  ): Promise<RenidlyObject | null> {
    const r = await this.transport.request(method, service, path, args);
    return this.applyOne(r);
  }

  private applyOne(r: Result): RenidlyObject | null {
    if (!this.cfg.unwrapData) return attach({ ...r.envelope }, r.meta) as RenidlyObject;
    if (r.error) {
      if (r.error instanceof NotFoundError) {
        if (this.cfg.throwOnNotFound) throw r.error;
        return null;
      }
      if (this.cfg.throwOnApiError) throw r.error;
      return null;
    }
    if (r.data === null || r.data === undefined) return null;
    return attach(r.data as object, r.meta) as RenidlyObject;
  }

  protected list(
    service: Service,
    method: string,
    path: string,
    params: Record<string, unknown>,
    paginator: Paginator,
    options?: RequestOptions,
  ): RenidlyListPromise {
    const p = params ?? {};
    const fetchPage = async (): Promise<RenidlyList> => {
      const r = await this.transport.request(method, service, path, { params: p, options });
      if (!this.cfg.unwrapData) return attach({ ...r.envelope }, r.meta) as unknown as RenidlyList;
      if (r.error) {
        if (this.cfg.throwOnApiError) throw r.error;
        return new RenidlyList([]);
      }
      const [items, hasMore, nextParams, nextCursor] = paginator(r.envelope, p);
      const built = items.map((it) => attach(it as object, r.meta));
      const pager = (np: Record<string, unknown>) => this.list(service, method, path, np, paginator, options);
      return new RenidlyList(built, hasMore, nextCursor, nextParams, pager, r.meta);
    };
    return autoPagingPromise(fetchPage());
  }
}
