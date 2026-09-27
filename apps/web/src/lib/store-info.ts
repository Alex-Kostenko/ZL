// Store contacts shown on /contacts.
// TODO(13.3): contacts are business settings — replace with the Settings API. Until then they stay
// empty (no invented phone numbers or addresses in production HTML); the page renders only what is
// filled in.

export interface StoreInfo {
  /** E.164, e.g. `+380441234567`. */
  phones: string[];
  email: string | null;
  /** Shop address for pickup, one line. */
  address: string | null;
  /** Opening hours, one line per range, e.g. `Пн–Пт 9:00–19:00`. */
  hours: string[];
}

export const STORE_INFO: StoreInfo = {
  phones: [],
  email: null,
  address: null,
  hours: [],
};
