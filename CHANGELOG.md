# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/renidly/renidly-node/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/renidly/renidly-node/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/renidly/renidly-node/releases/tag/v0.1.0
