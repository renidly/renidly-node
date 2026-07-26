# Contributing to the Renidly Node SDK

First off — **thank you!** Contributions of every size are welcome: bug reports, docs, tests, and features. This guide gets you productive in a couple of minutes.

## Ways to contribute

- 🐛 **Report a bug** — open an [issue](https://github.com/renidly/renidly-node/issues) with a minimal reproduction.
- 💡 **Request a feature** — open an issue describing the use case.
- 📖 **Improve docs** — the README, JSDoc, and examples can always be clearer.
- 🧑‍💻 **Send a pull request** — see below.

## Development setup

Requires **Node 18+**.

```sh
git clone https://github.com/renidly/renidly-node.git
cd renidly-node

npm install
```

## The two checks (CI runs exactly these)

```sh
npm run typecheck    # tsc --noEmit — static types
npm test             # vitest — tests (fast; fully mocked, no network)
npm run build        # tsup — verifies the ESM + CJS bundle and .d.ts emit
```

All must pass before a PR can merge.

## Project layout

```
src/
  client.ts        # Renidly (the public client)
  config.ts        # RenidlyConfig + resolution
  transport.ts     # HTTP engine: retries, response handling, error mapping
  errors.ts        # error hierarchy
  models.ts        # response objects + lastResponse attachment
  pagination.ts    # RenidlyList + auto-paging (async iterable)
  batch.ts         # batch job handles
  ratelimit.ts     # optional client-side rate limiter
  resources/       # the public method surface (account, data, emails, live)
  types/           # generated request-parameter interfaces
test/              # mocked unit tests (a fetch stub injected via config)
```

The core (`transport`, `models`, `pagination`, `batch`) is the stable machinery; the `resources/` files are thin, uniform wrappers over it. New endpoints usually mean a small addition to a resource file plus a test.

## Pull request guidelines

1. **Fork** the repo and create a branch off `main` (`git checkout -b fix/clear-error-message`).
2. **Keep it focused** — one logical change per PR.
3. **Add a test** for any behavior change (the suite injects a mock `fetch` via `config.fetch` — no network).
4. **Document it** — every public class and method has a JSDoc comment with a short example; match that style.
5. Run the checks locally and make sure they're green.
6. Open the PR with a clear description of *what* and *why*.

We aim to review PRs promptly. Maintainers may request changes or tweak details before merging.

## Coding standards

- **Types everywhere** — public methods are typed so they autocomplete in users' editors. Responses are intentionally loose so new API fields stay reachable.
- **JSDoc is required** on public classes/methods: one-line summary and an example.
- **Keep the surface consistent** — mirror existing method names and signatures. Method names are camelCase; Data-API filter params keep the API's snake_case, Live-API params keep the API's camelCase.

## Reporting security issues

Please do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md).

## Code of Conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
