// Errors — every failure rejects with a typed subclass of RenidlyError, and the
// message tells you exactly what went wrong (top-line + field-level detail).
// Run: RENIDLY_API_KEY=rnd-... node examples/errors.mjs
import {
  Renidly,
  RenidlyError,
  AuthenticationError,
  InvalidRequestError,
  InsufficientCreditsError,
  RateLimitError,
} from "renidly";

// 1. A bad key → AuthenticationError.
try {
  await new Renidly("rnd-not-a-real-key").account.balance();
} catch (e) {
  console.log("bad key ->", e.constructor.name + ":", e.serverMessage);
}

// 2. Invalid input → InvalidRequestError, with per-field detail.
const renidly = new Renidly();
try {
  await renidly.emails.find({ firstName: "A", lastName: "B", domain: "not a domain" });
} catch (e) {
  if (e instanceof InvalidRequestError) {
    console.log("validation ->", e.serverMessage);
    console.log("  fields:", e.fieldErrors); // { domain: "..." }
    console.log("  full message:", e.message); // self-explanatory one-liner
  }
}

// 3. Catch-all: every SDK error extends RenidlyError.
try {
  await renidly.data.skills.retrieve("skl_definitely_not_real");
} catch (e) {
  if (e instanceof RenidlyError) {
    console.log("caught:", e.constructor.name, "| status:", e.status, "| code:", e.errorCode);
  }
}

// Typed fields you can branch on:
//   InsufficientCreditsError            — top up and retry
//   RateLimitError { tier, limit, retryAfter }
//   NotFoundError                       — (note: single retrieve() returns null by default instead)
console.log("\nSpecific types available:", [InsufficientCreditsError, RateLimitError].map((c) => c.name).join(", "));
