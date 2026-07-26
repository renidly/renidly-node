/**
 * Data API (`renidly.data`).
 *
 * Clean, deduplicated professional records by stable opaque IDs (`prsn_`,
 * `org_`, `inst_`, `skl_`) or rich filters. `retrieve` resolves a single record
 * (or `null`); `search`/`employees`/`alumni` return a paginated `RenidlyList`;
 * `enrichBatch` returns a `BatchJob`.
 */
import { BatchJob } from "../batch.js";
import { RenidlyObject } from "../models.js";
import { RenidlyList } from "../pagination.js";
import { RequestOptions } from "../transport.js";
import {
  CompaniesEmployeesParams,
  CompaniesSearchParams,
  InstitutionsAlumniParams,
  JobChangesSearchParams,
  PeopleSearchParams,
} from "../types/params.js";
import { BaseResource } from "./base.js";
import { cursorPaginator, pagePaginator } from "./paginators.js";

const SVC = "data" as const;

function enrichBody(ids?: string[], handles?: string[], live?: boolean): Record<string, unknown> {
  return { ids: ids ?? [], handles: handles ?? [], enrich_live: !!live };
}

export class People extends BaseResource {
  /** Retrieve one professional record by stable `id` (`prsn_…`) or public `handle`. */
  retrieve(args: { id?: string; handle?: string }, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/people/profile", { params: { id: args.id, handle: args.handle }, options });
  }

  /**
   * Filter professional records; cursor-paginated.
   * @example for await (const p of renidly.data.people.search({ title: "cto" })) console.log(p.headline);
   */
  search(params: PeopleSearchParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/people/search", params as Record<string, unknown>, cursorPaginator, options);
  }

  /** Submit an async bulk people-enrichment job (up to 1000). Returns a `BatchJob`. */
  async enrichBatch(
    args: { ids?: string[]; handles?: string[]; live?: boolean },
    options?: RequestOptions,
  ): Promise<BatchJob> {
    const r = await this.transport.request("POST", SVC, "/people/batch/enrich", {
      body: enrichBody(args.ids, args.handles, args.live),
      options,
    });
    if (r.error) throw r.error;
    return new BatchJob(this.transport, SVC, "/people/batch/enrich", (r.data as { job_id: string })?.job_id, "profiles", true, options);
  }
}

export class Companies extends BaseResource {
  /** Retrieve one organization by opaque `id` (`org_…`) or public `slug`. */
  retrieve(args: { id?: string; slug?: string }, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/companies/company", { params: { id: args.id, slug: args.slug }, options });
  }

  /** Filter organizations; cursor-paginated. */
  search(params: CompaniesSearchParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/companies/search", params as Record<string, unknown>, cursorPaginator, options);
  }

  /** List people who work (or worked) at an organization; cursor-paginated. */
  employees(slug: string, params: CompaniesEmployeesParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/companies/employees", { ...params, slug }, cursorPaginator, options);
  }

  /** Submit an async bulk company-enrichment job (up to 1000). Returns a `BatchJob`. */
  async enrichBatch(
    args: { ids?: string[]; handles?: string[]; live?: boolean },
    options?: RequestOptions,
  ): Promise<BatchJob> {
    const r = await this.transport.request("POST", SVC, "/companies/batch/enrich", {
      body: enrichBody(args.ids, args.handles, args.live),
      options,
    });
    if (r.error) throw r.error;
    return new BatchJob(this.transport, SVC, "/companies/batch/enrich", (r.data as { job_id: string })?.job_id, "companies", true, options);
  }
}

export class Institutions extends BaseResource {
  /** Retrieve one institution by its `normalizedName` (lowercase, hyphenated). */
  retrieve(normalizedName: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/institutions/institution", { params: { normalized_name: normalizedName }, options });
  }

  /** Partial-match search on institution name (min 3 chars); page-paginated. */
  search(name: string, params: { page?: number; limit?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/institutions/search", { name, ...params }, pagePaginator, options);
  }

  /** Browse alumni / current students of an institution; page-paginated. */
  alumni(normalizedName: string, params: InstitutionsAlumniParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/institutions/alumni", { ...params, normalized_name: normalizedName }, pagePaginator, options);
  }
}

export class Skills extends BaseResource {
  /** Retrieve one skill by its opaque `skl_` id. */
  retrieve(id: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/skills/skill", { params: { id }, options });
  }

  /** Partial-match search on skill name (min 3 chars); page-paginated. */
  search(name: string, params: { page?: number; limit?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/skills/search", { name, ...params }, pagePaginator, options);
  }
}

export class JobChanges extends BaseResource {
  /** Search recent join / leave / title-change events; page-paginated. */
  search(params: JobChangesSearchParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/job-changes/search", params as Record<string, unknown>, pagePaginator, options);
  }
}

export class Data {
  readonly people: People;
  readonly companies: Companies;
  readonly institutions: Institutions;
  readonly skills: Skills;
  readonly jobChanges: JobChanges;
  constructor(...args: ConstructorParameters<typeof BaseResource>) {
    this.people = new People(...args);
    this.companies = new Companies(...args);
    this.institutions = new Institutions(...args);
    this.skills = new Skills(...args);
    this.jobChanges = new JobChanges(...args);
  }
}
