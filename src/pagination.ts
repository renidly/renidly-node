/**
 * List container with transparent auto-pagination.
 *
 * `for (const x of list)` iterates the CURRENT page; `for await (const x of list)`
 * (or `list.autoPagingIter()`) walks EVERY page, fetching lazily. `.data`,
 * `.hasMore`, and `.nextCursor` are there for manual control.
 */
import { LastResponse } from "./models.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RenidlyList<T = any> {
  constructor(
    /** Items on the current page. */
    public readonly data: T[],
    public readonly hasMore: boolean = false,
    public readonly nextCursor: string | null = null,
    private readonly _nextParams: Record<string, unknown> | null = null,
    private readonly _pager: ((p: Record<string, unknown>) => Promise<RenidlyList<T>>) | null = null,
    public readonly lastResponse?: LastResponse,
  ) {}

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
