/**
 * Account & Credits (`renidly.account`).
 *
 * Balance/tier read your account with the key; `tiers` and `routeCosts` are
 * public (no key). The SDK sends the correct `X-AUTHAPI-Key` header and the
 * required trailing slash on `/k/` routes for you.
 */
import { RenidlyObject } from "../models.js";
import { RenidlyListPromise } from "../pagination.js";
import { RequestOptions } from "../transport.js";
import { BaseResource } from "./base.js";
import { collection } from "./paginators.js";

const SVC = "account" as const;

export class Account extends BaseResource {
  /**
   * Get your current credit balance (`data.balance`).
   * @example
   * const bal = (await renidly.account.balance()).balance;
   */
  balance(options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/credits/balance/k/", { options });
  }

  /**
   * Get your tier, per-minute rate limit, balance, and neighbouring tiers.
   * @example
   * const t = await renidly.account.tier();
   * console.log(t.current_tier.name, t.current_tier.limit_per_minute);
   */
  tier(options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/credits/tier/k/", { options });
  }

  /** Get the credit balance for an Enterprise workspace (uses the same key). */
  enterpriseBalance(options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/credits/balance/k/enterprise/", { options });
  }

  /**
   * List the full public tier ladder — no key required.
   * @example
   * for (const tier of await renidly.account.tiers()) console.log(tier.name);
   */
  tiers(options?: RequestOptions): RenidlyListPromise {
    return this.list(SVC, "GET", "/user/sub/tiers/", {}, collection("results"), options);
  }

  /**
   * List per-route credit costs — no key required. Only routes whose cost is
   * not 1 are returned; anything absent costs 1 credit.
   */
  routeCosts(options?: RequestOptions): RenidlyListPromise {
    return this.list(SVC, "GET", "/credits/routes/costs/", {}, collection("routes"), options);
  }
}
