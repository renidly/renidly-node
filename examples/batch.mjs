// Batch jobs — process up to 1000 items in one async job. Submit resolves to a
// handle instantly; then block with .wait() or stream results as they resolve.
// Run: RENIDLY_API_KEY=rnd-... node examples/batch.mjs
import { Renidly } from "renidly";

const renidly = new Renidly();

// Submit — resolves to a BatchJob handle right away (does not wait for results).
const job = await renidly.emails.verifyBatch([
  "sundar@google.com",
  "patrick@stripe.com",
  "someone@nonexistent-domain-xyz.com",
]);
console.log("Job submitted:", job.id);

// Option 1: block until done and collect everything.
const result = await job.wait({ onProgress: (n) => process.stdout.write(`\r  resolved ${n}...`) });
console.log("\nStatus:", result.status, "—", result.resolved, "/", result.total, "resolved");
for (const row of result.results) {
  console.log("  •", row.email, "→ deliverable:", row.deliverable);
}
if (result.notFound.length) console.log("  not found:", result.notFound);

// Option 2: stream rows as they resolve (great for large jobs / progress UIs).
console.log("\nStreaming a people enrichment batch:");
const stream = (await renidly.data.people.enrichBatch({ handles: ["williamhgates", "ryanroslansky"] })).stream();
for await (const row of stream) {
  console.log("  •", row.matched_input, "→", row.headline ?? "(no data)");
}
