// Quickstart — the basic shape of every call: renidly.<product>.<resource>.<action>()
// Run: RENIDLY_API_KEY=rnd-... node examples/quickstart.mjs
import { Renidly } from "renidly";

const renidly = new Renidly(); // reads RENIDLY_API_KEY from the environment

// Retrieve a single record. Resolves to `null` (not an error) if nothing matched.
const person = await renidly.data.people.retrieve({ handle: "ryanroslansky" });
if (person) {
  console.log("Person:", person.first_name, person.last_name, "—", person.headline);
}

// Retrieve a company by its public slug (or { id: "org_..." }).
const company = await renidly.data.companies.retrieve({ slug: "stripe" });
if (company) {
  console.log("Company:", company.name, "—", company.headcount, "employees", `(${company.headcount_range})`);
}

// Verify a business email.
const email = await renidly.emails.verify("sundar@google.com");
console.log("Email:", email.email, "→ deliverable:", email.deliverable, `(${email.reason})`);

// Check your credit balance.
const bal = await renidly.account.balance();
console.log("Credits remaining:", bal.balance);
