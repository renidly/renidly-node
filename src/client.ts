/**
 * The public client. All methods are async (Promise-based); the same client
 * works in Node 18+ and the browser. Product namespaces hang off it:
 * `renidly.data`, `renidly.live`, `renidly.emails`, `renidly.account`.
 *
 * @example
 * import { Renidly } from "renidly";
 * const renidly = new Renidly("rnd-...");
 * const person = await renidly.data.people.retrieve({ handle: "ryanroslansky" });
 */
import { RenidlyConfig, Service, resolveConfig } from "./config.js";
import { APIResponse, attach } from "./models.js";
import { buildLimiter } from "./ratelimit.js";
import { Account } from "./resources/account.js";
import { Data } from "./resources/data.js";
import { Emails } from "./resources/emails.js";
import { Live } from "./resources/live.js";
import { RequestOptions, Transport } from "./transport.js";

export class Renidly {
  private readonly transport: Transport;

  readonly account: Account;
  readonly data: Data;
  readonly emails: Emails;
  readonly live: Live;

  /**
   * @param apiKey Your API key. Overrides `config.apiKey`; falls back to the
   *   `RENIDLY_API_KEY` env var.
   * @param config Everything else — see {@link RenidlyConfig}.
   */
  constructor(apiKey?: string, config?: RenidlyConfig) {
    const cfg = resolveConfig(apiKey, config);
    this.transport = new Transport(cfg);
    this.transport.limiter = buildLimiter(cfg, this.transport);
    this.account = new Account(this.transport, cfg);
    this.data = new Data(this.transport, cfg);
    this.emails = new Emails(this.transport, cfg);
    this.live = new Live(this.transport, cfg);
  }

  /** Escape hatch: call any endpoint directly; resolves the raw envelope. */
  async rawRequest(
    method: string,
    path: string,
    args: { service?: Service; params?: Record<string, unknown>; body?: unknown; options?: RequestOptions } = {},
  ): Promise<APIResponse> {
    const r = await this.transport.request(method, args.service ?? "data", path, args);
    return attach({ ...r.envelope }, r.lastResponse) as unknown as APIResponse;
  }
}
