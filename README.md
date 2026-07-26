# Renidly Node SDK

[![npm version](https://img.shields.io/npm/v/renidly.svg)](https://www.npmjs.com/package/renidly)
[![CI](https://github.com/renidly/renidly-node/actions/workflows/ci.yml/badge.svg)](https://github.com/renidly/renidly-node/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Types](https://img.shields.io/npm/types/renidly.svg)](https://www.npmjs.com/package/renidly)
[![Node](https://img.shields.io/node/v/renidly.svg)](https://nodejs.org/)

The official Node/TypeScript SDK for the [Renidly](https://renidly.com) B2B professional data APIs — resolve, search, enrich, and verify professional identities (people, organizations, institutions, skills, professional activity, job opportunities, and business email) through one clean, typed client.

```ts
import { Renidly } from "renidly";

const renidly = new Renidly("rnd-...");

const person  = await renidly.data.people.retrieve({ handle: "ryanroslansky" });
const company = await renidly.data.companies.retrieve({ slug: "stripe" });
const email   = await renidly.emails.verify("sundar@google.com");

console.log(person.headline, company.name, email.deliverable);
```

- **One client, four products** — `data`, `live`, `emails`, `account`, all off the same key.
- **Fully typed** — method names, parameters, and returns autocomplete in your editor (ships `.d.ts`).
- **Batteries included** — automatic retries, transparent pagination, batch jobs, a typed error hierarchy, and an optional self-tuning rate limiter.
- **Runs everywhere** — native `fetch`, zero dependencies, ESM **and** CommonJS, Node 18+ and modern browsers.

---

## Table of contents

- [Install](#install)
- [Quickstart](#quickstart)
- [Authentication](#authentication)
- [The four products](#the-four-products)
- [Pagination](#pagination)
- [Batch jobs](#batch-jobs)
- [Errors](#errors)
- [Configuration](#configuration)
- [Automatic rate limiting](#automatic-rate-limiting)
- [Response objects](#response-objects)
- [Advanced](#advanced)
- [Requirements & support](#requirements--support)

---

## Install

```sh
npm install renidly
```

Works with `pnpm`, `yarn`, and `bun` too. Requires **Node 18+** (for the global `fetch`).

Both module systems are supported out of the box:

```ts
import { Renidly } from "renidly";        // ESM / TypeScript
const { Renidly } = require("renidly");   // CommonJS
```

---

## Quickstart

```ts
import { Renidly } from "renidly";

const renidly = new Renidly("rnd-...");           // or new Renidly() and set RENIDLY_API_KEY

// Retrieve a single record (resolves to null if nothing matched)
const person = await renidly.data.people.retrieve({ id: "prsn_..." });
if (person) console.log(person.firstName, person.headline);

// Search with any filters — they autocomplete in your editor
for await (const p of renidly.data.people.search({ title: "cto", current_only: true })) {
  console.log(p.headline);
}

// Verify an email
const v = await renidly.emails.verify("sundar@google.com");
console.log(v.deliverable, v.reason);
```

Every call is async. The whole surface is `renidly.<product>.<resource>.<action>(...)`.

---

## Authentication

Pass your key to the constructor or through the environment — whichever you prefer.

```ts
new Renidly("rnd-...");                            // positional
new Renidly();                                     // reads RENIDLY_API_KEY
new Renidly(undefined, { apiKey: "rnd-..." });     // inside the config object
```

Per-request override (e.g. multi-tenant apps) — the second argument on any method:

```ts
await renidly.data.people.search({ title: "cto" }, { apiKey: "rnd-tenant-key" });
```

Grab your key from [Workspace → API Keys](https://renidly.com/dashboard/key).

---

## The four products

### `data` — clean, queryable records

Deduplicated professional records addressable by stable opaque IDs (`prsn_`, `org_`, `inst_`, `skl_`) or rich filters.

```ts
// People
await renidly.data.people.retrieve({ id: "prsn_..." });                 // or { handle: "..." }
await renidly.data.people.search({ title: "cto", skills: "python", geo_country_code: "US" });
await renidly.data.people.enrichBatch({ handles: [...], ids: [...], live: true });  // bulk (see Batch jobs)

// Companies
await renidly.data.companies.retrieve({ slug: "google" });              // or { id: "org_..." }
await renidly.data.companies.search({ name: "stripe", staff_count_min: 100 });
await renidly.data.companies.employees("google", { title: "engineer", current_only: true });
await renidly.data.companies.enrichBatch({ ids: [...] });               // bulk (see Batch jobs)

// Institutions
await renidly.data.institutions.retrieve("stanford");                   // by normalized name
await renidly.data.institutions.search("stanford");
await renidly.data.institutions.alumni("stanford", { degree: "MBA" });

// Skills
await renidly.data.skills.retrieve("skl_...");
await renidly.data.skills.search("python");

// Job changes — trigger-based prospecting
await renidly.data.jobChanges.search({ event_type: "joined", days_ago: 30 });
```

### `live` — freshest snapshot on demand

Resolve a single subject or run a discovery search.

```ts
// People — resolve a public handle to a stable id once, then reuse it
const eid = (await renidly.live.people.resolveHandle("williamhgates")).entityId;
await renidly.live.people.enrich({ entityId: eid });    // or { handle: "..." }
await renidly.live.people.employmentHistory(eid);
await renidly.live.people.endorsements(eid);
await renidly.live.people.lookalikes(eid);
await renidly.live.people.interests(eid);

// Organizations
const oid = (await renidly.live.organizations.resolveSlug("google")).id;
await renidly.live.organizations.enrich(oid);
await renidly.live.organizations.headcount(oid);
await renidly.live.organizations.similar(oid);
await renidly.live.organizations.affiliated(oid);
await renidly.live.organizations.activities(oid);
await renidly.live.organizations.opportunities("1441,1035");   // comma-separated org ids

// Opportunities (job postings)
await renidly.live.opportunities.retrieve("4019200001");
await renidly.live.opportunities.similar("4019200001");
await renidly.live.opportunities.relatedViews("4019200001");
await renidly.live.opportunities.hiringTeam("4019200001");
await renidly.live.opportunities.byPerson(eid);

// Activity
await renidly.live.activities.feed(eid);
await renidly.live.activities.retrieve(activityId);
await renidly.live.activities.reactions(activityId);
await renidly.live.activities.replies(activityId, { sortBy: "date_posted" });
await renidly.live.activities.repliesByAuthor(eid);

// Discover (search)
await renidly.live.discover.people({ keyword: "cto", count: 25 });
await renidly.live.discover.organizations({ keyword: "fintech", headcountRange: "51-200" });
await renidly.live.discover.opportunities({ keyword: "python", workplaceTypes: "remote" });
```

### `emails` — verify, find, and resolve

```ts
await renidly.emails.verify("sundar@google.com");
await renidly.emails.find({ firstName: "Patrick", lastName: "Collison", domain: "stripe.com" });
await renidly.emails.findByUrl("https://example.com/in/someone");   // from a professional profile URL
await renidly.emails.reverse("john@acme.com");                      // who is behind this business email
await renidly.emails.prospects("acme.com", "verified_only");        // known contacts for a domain

// Bulk (see Batch jobs)
await renidly.emails.verifyBatch(["a@x.com", "b@y.com"]);
await renidly.emails.findBatch([{ firstName: "A", lastName: "B", domain: "acme.com" }]);
```

### `account` — balance, tier, and pricing

```ts
(await renidly.account.balance()).balance;
(await renidly.account.tier()).current_tier.limit_per_minute;
await renidly.account.enterpriseBalance();   // for an Enterprise workspace
await renidly.account.tiers();               // public tier ladder (no key needed)
await renidly.account.routeCosts();          // per-endpoint credit costs (no key needed)
```

---

## Pagination

Every `search`/list method resolves to a list you can use directly **and** page through transparently with `for await`.

```ts
const page = await renidly.data.people.search({ title: "cto", limit: 25 });

page.length;         // items on this page
page.data[0];        // index into this page
page.hasMore;        // is there more?
for (const p of page) { /* iterate just this page */ }

// ...or walk EVERY page lazily (fetches as it goes, one page in memory at a time)
for await (const person of renidly.data.people.search({ title: "cto" })) {
  console.log(person.headline);
}
```

The returned `RenidlyList` is itself async-iterable, so `for await` over the search call transparently follows the cursor. Prefer to be explicit? Call `.autoPagingIter()`.

---

## Batch jobs

Process up to 1000 items in one async job. Submit resolves to a handle instantly.

```ts
const job = await renidly.data.people.enrichBatch({
  handles: ["ryanroslansky", "williamhgates"],
  live: true,
});

// block until done and collect everything
const result = await job.wait({ onProgress: (n) => console.log("resolved", n) });
console.log(result.status, result.resolved, "/", result.total);
for (const row of result.results) {
  console.log(row.matched_input, "->", row.headline);
}
console.log("not found:", result.notFound);

// ...or stream results as they resolve
for await (const row of (await renidly.emails.verifyBatch(["a@x.com", "b@y.com"])).stream()) {
  console.log(row.email, row.deliverable);
}
```

Available on `data.people.enrichBatch`, `data.companies.enrichBatch`, `emails.verifyBatch`, `emails.findBatch`.

---

## Errors

Every failure rejects with a specific subclass of `RenidlyError`, and the message tells you exactly what went wrong.

```ts
import {
  RenidlyError, AuthenticationError, InvalidRequestError,
  InsufficientCreditsError, NotFoundError, RateLimitError,
  PermissionDeniedError, ServiceUnavailableError,
} from "renidly";

try {
  await renidly.emails.find({ firstName: "A", lastName: "B", domain: "bad" });
} catch (e) {
  if (e instanceof InvalidRequestError) {
    console.log(e.serverMessage);   // "Validation failed"
    console.log(e.fieldErrors);     // { domain: "must be a bare hostname" }
  } else if (e instanceof RateLimitError) {
    console.log(e.tier, e.limit, e.retryAfter);
  } else if (e instanceof RenidlyError) {
    console.log(e.status, e.errorCode, e.serverMessage, e.errors);
  }
}
```

The `.message` includes the detail, so an uncaught error is self-explanatory:

```
InvalidRequestError: Validation failed — domain: must be a bare hostname (VALIDATION_ERROR, HTTP 400)
```

| Error | When |
|---|---|
| `AuthenticationError` | missing / invalid key |
| `PermissionDeniedError` | key valid but not allowed here |
| `InvalidRequestError` | bad input (see `.fieldErrors`) |
| `InsufficientCreditsError` | not enough credits |
| `NotFoundError` | job not found / expired |
| `RateLimitError` | per-minute limit hit (`.tier`, `.limit`, `.retryAfter`) |
| `ServiceUnavailableError` | temporary — retry shortly |
| `APIConnectionError` | network / timeout |

> **Not-found lookups:** a single `retrieve(...)` that resolves nothing returns `null` by default (not a rejection). Set `throwOnNotFound: true` to throw instead.

---

## Configuration

All options live on the second constructor argument:

```ts
const renidly = new Renidly("rnd-...", {
  timeout: 30_000,          // ms
  maxRetries: 3,            // auto-retry on 429 / 503 / connection errors (backoff + jitter)
  unwrapData: true,         // return the data model (false -> the full envelope)
  throwOnNotFound: false,   // single lookups return null when empty (true -> throw)
  throwOnApiError: true,    // map failures to typed errors
  autoRateLimit: false,     // see below
});
```

| Option | Default | Meaning |
|---|---|---|
| `apiKey` | `RENIDLY_API_KEY` env | Your key (the positional arg overrides this). |
| `timeout` | `30000` | Per-request timeout (ms). |
| `maxRetries` | `2` | Retries on transient failures. |
| `backoffFactor` | `500` | Base ms for exponential backoff. |
| `baseUrl` | `https://renidly.com` | Override the API host. |
| `defaultHeaders` | `{}` | Extra headers on every request. |
| `fetch` | global `fetch` | Bring your own fetch implementation. |
| `unwrapData` | `true` | Return `data` vs the full envelope. |
| `throwOnNotFound` | `false` | `null` vs `NotFoundError` on empty lookups. |
| `throwOnApiError` | `true` | Throw vs return `null` on API errors. |
| `autoRateLimit` | `false` | Self-throttle to your tier's limit. |
| `rateLimitPerMinute` | — | Fixed limit (required for enterprise keys). |
| `rateLimitSafety` | `1.0` | Fraction of the limit to target (e.g. `0.9`). |

---

## Automatic rate limiting

Turn it on and the SDK keeps you under your per-minute limit automatically — no limiter to build.

```ts
// Regular key: the limit is read from your tier and refreshed automatically.
new Renidly("rnd-...", { autoRateLimit: true });

// Enterprise key: the limit is fixed — supply it.
new Renidly("enterprise-...", { autoRateLimit: true, rateLimitPerMinute: 550 });
```

It uses a sliding 60-second window so you never exceed the limit, and re-reads your tier after a `429`.

---

## Response objects

Responses are plain, dynamic, drill-able objects — access any field (nested included) directly, no schema classes required.

```ts
const t = await renidly.account.tier();
t.current_tier.name;             // nested access, arbitrarily deep

// HTTP metadata is attached to every object (non-enumerable, so it won't show in JSON.stringify)
t.lastResponse.statusCode;
t.lastResponse.requestId;
```

Using TypeScript and want a shape for a field? Cast it — responses are intentionally loosely typed so new API fields are always reachable:

```ts
const name = (t.current_tier as { name: string }).name;
```

Prefer the raw envelope? Set `unwrapData: false` and every call resolves to `{ success, statusCode, message, data, ... }`.

---

## Advanced

**Per-request options** override config for a single call:

```ts
await renidly.data.skills.search("python", { timeout: 5_000, apiKey: "rnd-other" });
```

**Escape hatch** — call any endpoint directly:

```ts
const env = await renidly.rawRequest("GET", "/people/search", {
  service: "data",
  params: { title: "cto" },
});
console.log(env.success, env.data);
```

---

## Requirements & support

- Node **18+** (or any runtime with a global `fetch`).
- **Zero runtime dependencies.** ESM + CommonJS, with TypeScript declarations bundled.

Questions or issues? Open one on [GitHub](https://github.com/renidly/renidly-node/issues).

## Contributing

Contributions are welcome and appreciated — bug reports, docs, tests, and features alike. See **[CONTRIBUTING.md](CONTRIBUTING.md)** to get set up in a couple of minutes, and please review our [Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Renidly
