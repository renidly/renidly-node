/**
 * Email API (`renidly.emails`).
 *
 * Verify deliverability, find work emails, reverse-resolve the person/company
 * behind a business email, list known contacts, and run verify/find in bulk.
 */
import { BatchJob } from "../batch.js";
import { RenidlyObject } from "../models.js";
import { RenidlyListPromise } from "../pagination.js";
import { RequestOptions } from "../transport.js";
import { BaseResource, Paginator } from "./base.js";

const SVC = "emails" as const;

const prospectsPaginator: Paginator = (env, params) => {
  const d = (env.data as Record<string, unknown>) ?? {};
  const items = (d.prospects as unknown[]) ?? [];
  const nc = (d.next_cursor as string | undefined) ?? null;
  const hasMore = Boolean(nc);
  return [items, hasMore, hasMore ? { ...params, cursor: nc } : null, nc];
};

export class Emails extends BaseResource {
  /** Check whether an email address can receive mail, and flag risks. */
  verify(email: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/verify", { params: { email }, options });
  }

  /** Discover a person's work email from name + company domain. */
  find(
    args: { firstName: string; lastName: string; domain: string },
    options?: RequestOptions,
  ): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/find", {
      params: { first_name: args.firstName, last_name: args.lastName, domain: args.domain },
      options,
    });
  }

  /** Find a work email from a professional profile URL. */
  findByUrl(url: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/find/linkedin", { params: { url }, options });
  }

  /** Resolve the person + company behind a business email (business mailboxes only). */
  reverse(email: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/reverse", { params: { email }, options });
  }

  /** Page emails already known for a company domain. `kind`: `full` | `verified_only`. */
  prospects(
    domain: string,
    kind: "full" | "verified_only",
    params: { cursor?: string } = {},
    options?: RequestOptions,
  ): RenidlyListPromise {
    return this.list(SVC, "GET", "/prospects", { domain, kind, ...params }, prospectsPaginator, options);
  }

  /** Submit a bulk email-verification job (up to 1000). Returns a `BatchJob`. */
  async verifyBatch(emails: string[], options?: RequestOptions): Promise<BatchJob> {
    const r = await this.transport.request("POST", SVC, "/verify/batch", { body: { emails }, options });
    if (r.error) throw r.error;
    return new BatchJob(this.transport, SVC, "/verify/batch", (r.data as { job_id: string })?.job_id, "results", true, options);
  }

  /** Submit a bulk work-email-finding job (up to 1000). Returns a `BatchJob`. */
  async findBatch(
    queries: Array<{ firstName: string; lastName: string; domain: string }>,
    options?: RequestOptions,
  ): Promise<BatchJob> {
    const body = {
      queries: queries.map((q) => ({ first_name: q.firstName, last_name: q.lastName, domain: q.domain })),
    };
    const r = await this.transport.request("POST", SVC, "/find/batch", { body, options });
    if (r.error) throw r.error;
    return new BatchJob(this.transport, SVC, "/find/batch", (r.data as { job_id: string })?.job_id, "results", false, options);
  }
}
