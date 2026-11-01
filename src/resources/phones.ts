/**
 * Phone API (`renidly.phones`).
 *
 * Get a professional's phone numbers from their profile URL, and resolve the
 * professional behind a phone number.
 */
import { RenidlyObject } from "../models.js";
import { RequestOptions } from "../transport.js";
import { BaseResource } from "./base.js";

const SVC = "phones" as const;

export class Phones extends BaseResource {
  /**
   * A person's phone numbers, best first, from their profile URL or username.
   * Resolves `{ found, person, phones }`; `found` is false (billed 1 credit) when
   * the profile doesn't exist or has no known numbers.
   */
  find(url: string, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/find", { params: { url }, options });
  }

  /**
   * The people behind a phone number (up to 3 when shared). `country` is the
   * ISO code for a number without a country code (default `US`). Resolves
   * `{ phone, found, candidates }`; an unknown number is free.
   */
  reverse(phone: string, args: { country?: string } = {}, options?: RequestOptions): Promise<RenidlyObject | null> {
    return this.one(SVC, "GET", "/reverse", { params: { phone, country: args.country }, options });
  }
}
