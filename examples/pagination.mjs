// Pagination — `.autoPagingIter()` is an async generator (`async function*` +
// `yield`) that yields items and fetches the next page lazily.
//
// A `search(...)` call returns a HYBRID: it's both a Promise of the first page
// AND async-iterable. So you get to choose:
//   • `await search(...)`            -> one page (a RenidlyList)
//   • `for await (... search(...))`  -> walk every page, lazily
// Run: RENIDLY_API_KEY=rnd-... node examples/pagination.mjs
import { Renidly } from "renidly";

const renidly = new Renidly();

// ── One page: await it ───────────────────────────────────────────────────
const page = await renidly.data.people.search({ title: "cto", limit: 10 });
console.log("This page:", page.length, "items — hasMore:", page.hasMore);
console.log("First headline:", page.data[0]?.headline);
for (const p of page) {
  console.log("  •", p.headline); // synchronous for...of iterates JUST this page
}

// ── Every page: for await it (no `await` needed — the hybrid drives itself) ─
let count = 0;
for await (const person of renidly.data.people.search({ title: "cto" })) {
  count++;
  if (count <= 3) console.log("all-pages:", person.headline);
  if (count >= 50) break; // stop anytime — nothing beyond what you consume is fetched
}
console.log("Walked", count, "people across pages.");

// ── The explicit generator: autoPagingIter() (same thing, by name) ─────────
// Await the first page, then call .autoPagingIter() to get the async generator.
const iter = (await renidly.data.companies.search({ name: "labs" })).autoPagingIter();
const first = await iter.next(); // it's a real async generator — .next() works too
console.log("First company via generator:", first.value?.name);
