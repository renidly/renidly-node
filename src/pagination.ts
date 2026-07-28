/**
 * List container with transparent auto-pagination.
 *
 * `for (const x of list)` iterates the CURRENT page; `for await (const x of list)`
 * (or `list.autoPagingIter()`) walks EVERY page, fetching lazily. `.data`,
 * `.hasMore`, and `.nextCursor` are there for manual control.
 */
import { ResponseMeta } from "./models.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RenidlyList<T = any> {
  constructor(
    /** Items on the current page. */
    public readonly data: T[],
    public readonly hasMore: boolean = false,
    public readonly nextCursor: string | null = null,
    private readonly _nextParams: Record<string, unknown> | null = null,
    private readonly _pager: ((p: Record<string, unknown>) => Promise<RenidlyList<T>>) | null = null,
    /** HTTP metadata (status, headers, credits, body, rawHttp) for THIS page. */
    public readonly meta?: ResponseMeta,
  ) {}

  /** Deprecated alias for {@link meta}. */
  get lastResponse(): ResponseMeta | undefined {
    return this.meta;
  }

  /** Number of items on the current page. */
  get length(): number {
    return this.data.length;
  }

  /** Iterate the CURRENT page. */
  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }

  /** Iterate EVERY item across all pages, fetching lazily. */
  async *autoPagingIter(): AsyncGenerator<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let page: RenidlyList<T> = this;
    while (true) {
      for (const item of page.data) yield item;
      if (!(page.hasMore && page._pager && page._nextParams)) return;
      page = await page._pager(page._nextParams);
    }
  }

  /** `for await (const item of list)` walks all pages. */
  [Symbol.asyncIterator](): AsyncGenerator<T> {
    return this.autoPagingIter();
  }
}

/**
 * What every `search`/list method returns: a Promise of the first page that is
 * ALSO async-iterable. So `await search(...)` gives you one page, and
 * `for await (const x of search(...))` walks every page — no extra `await`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RenidlyListPromise<T = any> = Promise<RenidlyList<T>> & AsyncIterable<T>;

/** Attach auto-paging iteration to a list Promise, yielding the hybrid above. */
export function autoPagingPromise<T>(promise: Promise<RenidlyList<T>>): RenidlyListPromise<T> {
  const hybrid = promise as RenidlyListPromise<T>;
  hybrid[Symbol.asyncIterator] = (): AsyncGenerator<T> =>
    (async function* () {
      yield* (await promise).autoPagingIter();
    })();
  return hybrid;
}
