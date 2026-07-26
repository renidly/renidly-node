# Examples

Runnable, copy-paste examples for the [`renidly`](https://www.npmjs.com/package/renidly) SDK.

## Setup

```sh
npm install renidly
export RENIDLY_API_KEY="rnd-..."   # your key from https://renidly.com/dashboard/key
```

Then run any file with Node 18+:

```sh
node examples/quickstart.mjs
node examples/pagination.mjs
node examples/batch.mjs
node examples/errors.mjs
```

(TypeScript version: `npx tsx examples/typescript.ts`.)

| File | Shows |
|---|---|
| `quickstart.mjs` | Retrieve, search, verify — the basic shape of every call. |
| `pagination.mjs` | Paging one page vs. walking every page with `for await` / `autoPagingIter()`. |
| `batch.mjs` | Submitting a batch job and collecting results (blocking and streaming). |
| `errors.mjs` | The typed error hierarchy and how to read what went wrong. |
| `typescript.ts` | The same calls with editor autocomplete and types. |
