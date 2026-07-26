/**
 * Live API (`renidly.live`).
 *
 * Resolve a single subject (person, organization, opportunity, activity) or run
 * a discovery search, returning the freshest snapshot on demand. Query params
 * use the API's native camelCase. `_livePaginator` auto-detects the items array
 * and whether the endpoint pages by cursor (`nextCursor`) or offset.
 */
import { RenidlyObject } from "../models.js";
import { RenidlyList } from "../pagination.js";
import { RequestOptions } from "../transport.js";
import {
  DiscoverOpportunitiesParams,
  DiscoverOrganizationsParams,
  DiscoverPeopleParams,
} from "../types/params.js";
import { BaseResource, Paginator } from "./base.js";

const SVC = "live" as const;

const livePaginator: Paginator = (env, params) => {
  const d = (env.data as Record<string, unknown>) ?? {};
  const items = (Object.values(d).find((v) => Array.isArray(v)) as unknown[]) ?? [];
  const nc = d.nextCursor as string | undefined;
  if (nc) return [items, true, { ...params, cursor: nc }, nc];
  const hasMore = Boolean(d.hasMore);
  const start = Number(params.start ?? 0);
  const count = Number(params.count ?? items.length ?? 20);
  return [items, hasMore, hasMore ? { ...params, start: start + count } : null, null];
};

export class LivePeople extends BaseResource {
  /** Retrieve one professional's full live profile (by `entityId` or `handle`). */
  enrich(args: { entityId?: string; handle?: string }, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/person/enrich", { params: { entityId: args.entityId, handle: args.handle }, options });
  }
  /** Resolve a public handle to a stable `entityId` (do it once, reuse it). */
  resolveHandle(handle: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/person/resolve-handle", { params: { handle }, options });
  }
  /** Retrieve a person's complete work history. */
  employmentHistory(entityId: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/person/employment-history", { params: { entityId }, options });
  }
  /** List recommendations written for a person. */
  endorsements(entityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/person/endorsements", { entityId }, livePaginator, options);
  }
  /** Find similar professional profiles (peers). */
  lookalikes(entityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/person/lookalikes", { entityId }, livePaginator, options);
  }
  /** List entities a person follows. */
  interests(entityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/person/interests", { entityId }, livePaginator, options);
  }
}

export class LiveActivities extends BaseResource {
  /** List a person's recent posts / activity stream; cursor-paginated. */
  feed(entityId: string, params: { cursor?: string; start?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/activity/feed", { entityId, ...params }, livePaginator, options);
  }
  /** Retrieve one post's full content + top-level comments. */
  retrieve(entityId: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/activity/details", { params: { entityId }, options });
  }
  /** List the people who reacted to a post; offset-paginated (`start` multiple of 10). */
  reactions(entityId: string, params: { start?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/activity/reactions", { entityId, ...params }, livePaginator, options);
  }
  /** List comments/replies on a post; offset-paginated. `sortBy`: `relevance` | `date_posted`. */
  replies(
    entityId: string,
    params: { sortBy?: string; count?: number; start?: number } = {},
    options?: RequestOptions,
  ): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/activity/replies", { entityId, ...params }, livePaginator, options);
  }
  /** List comments authored by a person across posts; cursor-paginated. */
  repliesByAuthor(
    entityId: string,
    params: { cursor?: string; start?: number } = {},
    options?: RequestOptions,
  ): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/activity/replies/by-author", { entityId, ...params }, livePaginator, options);
  }
}

export class LiveOpportunities extends BaseResource {
  /** Retrieve one job posting's full details. */
  retrieve(opportunityEntityId: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/opportunity/details", { params: { opportunityEntityId }, options });
  }
  /** List job postings similar to a given one. */
  similar(opportunityEntityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/opportunity/similar", { opportunityEntityId }, livePaginator, options);
  }
  /** List "people also viewed" postings. */
  relatedViews(opportunityEntityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/opportunity/related-views", { opportunityEntityId }, livePaginator, options);
  }
  /** List the hiring-team members for a posting. */
  hiringTeam(opportunityEntityId: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/opportunity/hiring-team", { opportunityEntityId }, livePaginator, options);
  }
  /** List postings created by a person (e.g. a recruiter's open roles). */
  byPerson(personEntityId: string, params: { count?: number; start?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/opportunity/by-person", { personEntityId, ...params }, livePaginator, options);
  }
}

export class LiveOrganizations extends BaseResource {
  /** Retrieve one company's full live profile (numeric `id`). */
  enrich(id: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/organization/enrich", { params: { id }, options });
  }
  /** Get a company's employee count + distribution buckets. */
  headcount(id: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/organization/headcount", { params: { id }, options });
  }
  /** List similar companies / peers. */
  similar(id: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/organization/similar", { id }, livePaginator, options);
  }
  /** List affiliated / subsidiary / showcase pages. */
  affiliated(id: string, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/organization/affiliated", { id }, livePaginator, options);
  }
  /** Resolve a public company slug to its numeric `id` (resolve once, reuse). */
  resolveSlug(slug: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/organization/resolve-slug", { params: { slug }, options });
  }
  /** List a company's recent posts; offset-paginated. */
  activities(id: string, params: { start?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/organization/activities", { id, ...params }, livePaginator, options);
  }
  /** List open postings across organizations (comma-separated ids); offset-paginated. */
  opportunities(organizationEntityIds: string, params: { start?: number } = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/organization/opportunities", { organizationEntityIds, ...params }, livePaginator, options);
  }
}

export class LiveDiscover extends BaseResource {
  /** Search professionals by keyword + filters; offset-paginated. */
  people(params: DiscoverPeopleParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/discover/people", params as Record<string, unknown>, livePaginator, options);
  }
  /** Search companies by keyword + filters; offset-paginated. */
  organizations(params: DiscoverOrganizationsParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/discover/organizations", params as Record<string, unknown>, livePaginator, options);
  }
  /** Search job postings by keyword + rich filters; offset-paginated. */
  opportunities(params: DiscoverOpportunitiesParams = {}, options?: RequestOptions): Promise<RenidlyList> {
    return this.list(SVC, "GET", "/discover/opportunities", params as Record<string, unknown>, livePaginator, options);
  }
}

export class Live {
  readonly people: LivePeople;
  readonly activities: LiveActivities;
  readonly opportunities: LiveOpportunities;
  readonly organizations: LiveOrganizations;
  readonly discover: LiveDiscover;
  constructor(...args: ConstructorParameters<typeof BaseResource>) {
    this.people = new LivePeople(...args);
    this.activities = new LiveActivities(...args);
    this.opportunities = new LiveOpportunities(...args);
    this.organizations = new LiveOrganizations(...args);
    this.discover = new LiveDiscover(...args);
  }
}
