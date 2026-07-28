// TypeScript — the same calls, now with editor autocomplete on method names,
// parameters, and the config. Responses are intentionally loose so any (even
// brand-new) API field stays reachable; cast when you want a concrete shape.
// Run: RENIDLY_API_KEY=rnd-... npx tsx examples/typescript.ts
import { Renidly, RateLimitError, type RenidlyConfig } from "renidly";

const config: RenidlyConfig = {
  timeout: 15_000,
  maxRetries: 3,
  autoRateLimit: true, // self-throttle to your tier's per-minute limit
};

const renidly = new Renidly(undefined, config); // key comes from RENIDLY_API_KEY

async function main(): Promise<void> {
  // `search(...)` params autocomplete; the result is a RenidlyList you can
  // `for await` over to walk every page.
  let n = 0;
  for await (const person of renidly.data.people.search({ title: "cto", current_only: true })) {
    // `person` is drill-able; cast the fields you care about for type safety.
    const { headline } = person as { headline?: string };
    if (headline) console.log(headline);
    if (++n >= 5) break;
  }

  // HTTP metadata + credit accounting is attached to every response object under .meta (non-enumerable).
  const company = await renidly.data.companies.retrieve({ slug: "stripe" });
  console.log("request id:", company?.meta.requestId);
  console.log("credits charged:", company?.meta.creditConsumed, "| balance left:", company?.meta.remainingBalance);
}

main().catch((e) => {
  if (e instanceof RateLimitError) console.error("rate limited:", e.tier, e.limit);
  else throw e;
});
