# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-09-26

### Added

- New `data.people.search()` filters, typed on `PeopleSearchParams` for IDE
  autocomplete: `follower_count_min`, `company_size_min` / `company_size_max`,
  `industry`, `experience_min_years`, `function`, `function_min_years`,
  `description`, `exclude_titles`, `exclude_organization_slugs`, and
  `exclude_industries`. Regenerated from the Data API OpenAPI spec.

## [0.2.1] — 2026-09-26

### Fixed

- `autoRateLimit` now reads the per-minute limit for enterprise accounts too
  (top-level `limit_per_minute`; `current_tier` is `null` for them). Previously
  an enterprise account whose key did not start with `enterprise-` silently fell
  back to 1 request/minute.
- An undeterminable limit no longer throttles to 1 request/minute: the SDK emits
  a `RenidlyRateLimitWarning` and skips client-side throttling (server 429s are
  still retried) until a later refresh succeeds.
- The tier endpoint is no longer re-fetched on every request while the limit is
  unknown, and concurrent first calls share one tier fetch.

### Changed

- `enterprise-` keys no longer require `rateLimitPerMinute`; the fixed limit is
  read from the account. The option remains as an override.

## [0.1.2] — 2026-07-26

### Added

- `search`/list methods now return a hybrid that is **both** awaitable and
  async-iterable: `await search(...)` gives one page, and
  `for await (const x of search(...))` walks every page — no extra `await`
  needed. Exposed as the `RenidlyListPromise` type.
- Runnable `examples/` (quickstart, pagination, batch, errors, TypeScript).

### Fixed

- README examples: corrected a snake_case field access (`first_name`) and
  clarified the pagination / `autoPagingIter()` usage.

## [0.1.1] — 2026-07-26

### Added

- Test suite (vitest, fully mocked — no network), README with usage examples
  and badges, community & contributor docs (`CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `CHANGELOG.md`, issue/PR
  templates), and CI + release workflows (npm Trusted Publishing).

_No runtime or API changes._

## [0.1.0] — 2026-07-26

Initial public release.

### Added

- A single, fully-typed `Renidly` client — all methods are async and the whole
  surface autocompletes in your editor (bundled `.d.ts`).
- One configuration object (the constructor's second argument) for all options.
- Four product namespaces off one API key:
  - `data` — people, companies, institutions, skills, job changes (retrieve,
    search, and bulk `enrichBatch`).
  - `live` — people, organizations, opportunities, activities, and discovery
    search.
  - `emails` — verify, find, find-by-URL, reverse, prospects, and bulk
    `verifyBatch` / `findBatch`.
  - `account` — balance, tier, enterprise balance, tier ladder, route costs.
- Automatic retries with exponential backoff + jitter on transient failures.
- Transparent pagination — `RenidlyList` is async-iterable (`for await`) via
  `autoPagingIter()`.
- Batch job handles with `.wait()` and streaming `.stream()`.
- Typed error hierarchy (`RenidlyError` and subclasses) whose messages surface
  the server's field-level detail.
- Dynamic, drill-able response objects with non-enumerable `lastResponse` HTTP
  metadata.
- Optional built-in client-side rate limiter (`autoRateLimit`).
- Zero runtime dependencies; native `fetch`; ships both ESM and CommonJS.

[Unreleased]: https://github.com/renidly/renidly-node/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/renidly/renidly-node/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/renidly/renidly-node/compare/v0.1.2...v0.2.1
[0.1.2]: https://github.com/renidly/renidly-node/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/renidly/renidly-node/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/renidly/renidly-node/releases/tag/v0.1.0
