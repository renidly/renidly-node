/**
 * Batch job handles for the async enrichment / verify / find endpoints.
 *
 * Submit returns a handle immediately; then either await `wait()` (blocking) or
 * consume `stream()` (an async generator that yields items as pages resolve).
 */
import { Service } from "./config.js";
import { RenidlyObject } from "./models.js";
import { RequestOptions, Transport } from "./transport.js";

export interface BatchResult {
  status: string;
  total: number;
  resolved: number;
  errors: number;
  results: RenidlyObject[];
  notFound: string[];
}

export interface PollOptions {
  pollInterval?: number; // ms, default 1500
  timeout?: number; // ms
}

function rows(data: Record<string, unknown>, key: string, keyed: boolean): RenidlyObject[] {
  const container = data[key];
  const out: RenidlyObject[] = [];
  if (keyed && container && typeof container === "object" && !Array.isArray(container)) {
    for (const [k, v] of Object.entries(container)) {
      out.push(
        (v && typeof v === "object" ? { ...v, matched_input: k } : { value: v, matched_input: k }) as RenidlyObject,
      );
    }
  } else if (Array.isArray(container)) {
    for (const item of container) out.push(item as RenidlyObject);
  }
  return out;
}

export class BatchJob {
  private lastMeta: Record<string, unknown> = {};
  private notFoundAcc: string[] = [];

  constructor(
    private readonly transport: Transport,
    private readonly service: Service,
    private readonly path: string,
    readonly id: string,
    private readonly resultsKey: string,
    private readonly keyed: boolean,
    private readonly options?: RequestOptions,
  ) {}

  private async poll(after: number): Promise<Record<string, unknown>> {
    const r = await this.transport.request("GET", this.service, this.path, {
      params: { job_id: this.id, after },
      options: this.options,
    });
    if (r.error) throw r.error;
    return (r.data ?? {}) as Record<string, unknown>;
  }

  /** Current job meta (status/total/resolved/errors) without collecting. */
  async status(): Promise<{ status?: unknown; total?: unknown; resolved?: unknown; errors?: unknown }> {
    const d = await this.poll(0);
    return { status: d.status, total: d.total, resolved: d.resolved, errors: d.errors };
  }

  /** Yield each result as it resolves. */
  async *stream(opts: PollOptions = {}): AsyncGenerator<RenidlyObject> {
    const pollInterval = opts.pollInterval ?? 1500;
    const deadline = opts.timeout ? Date.now() + opts.timeout : null;
    let after = 0;
    const notFound: string[] = [];
    while (true) {
      const d = await this.poll(after);
      for (const row of rows(d, this.resultsKey, this.keyed)) yield row;
      for (const nf of (d.not_found as string[] | undefined) ?? []) notFound.push(nf);
      this.lastMeta = d;
      const nc = d.next_cursor as number | undefined;
      if (nc !== undefined && nc !== null && nc !== after) {
        after = nc;
        continue;
      }
      if (d.status === "completed" || d.status === "error") {
        this.notFoundAcc = notFound;
        return;
      }
      if (deadline !== null && Date.now() >= deadline) {
        this.notFoundAcc = notFound;
        return;
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
  }

  /** Wait until the job finishes, returning all results. */
  async wait(opts: PollOptions & { onProgress?: (n: number) => void } = {}): Promise<BatchResult> {
    const results: RenidlyObject[] = [];
    for await (const row of this.stream(opts)) {
      results.push(row);
      opts.onProgress?.(results.length);
    }
    const m = this.lastMeta;
    return {
      status: (m.status as string) ?? "unknown",
      total: (m.total as number) ?? 0,
      resolved: (m.resolved as number) ?? results.length,
      errors: (m.errors as number) ?? 0,
      results,
      notFound: this.notFoundAcc,
    };
  }
}
