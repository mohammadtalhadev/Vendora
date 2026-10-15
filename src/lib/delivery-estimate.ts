/**
 * Delivery-time estimates — the single source every customer surface reads.
 *
 * The platform standard is 2–4 business days: that is what the Terms state,
 * and it remains the fallback everywhere. On top of it, a seller may publish
 * their own delivery times per region tier (Batch 91) from their shipping
 * settings; buyers then see the seller's figures for their tier instead of
 * the standard. Regions are tiers — same city, same province, rest of
 * Pakistan — because both the seller's origin and the buyer's address carry
 * city/state as free text; there is no province register anywhere in the
 * schema to key a per-province table on. Every surface — product page,
 * checkout, policy prose — resolves through this module instead of restating
 * (and drifting) its own numbers.
 */
export interface DeliveryDayRange {
  readonly min: number;
  readonly max: number;
}

export const STANDARD_DELIVERY_BUSINESS_DAYS: DeliveryDayRange = { min: 2, max: 4 };

/** The bounds a seller-set range must sit inside, fastest and slowest. */
export const SELLER_DELIVERY_DAY_LIMITS = { min: 1, max: 15 } as const;

/** Region tiers, relative to the seller's dispatch origin. */
export type DeliveryRegionTier = 'sameCity' | 'sameProvince' | 'nationwide';

export const DELIVERY_REGION_TIERS: readonly DeliveryRegionTier[] = [
  'sameCity',
  'sameProvince',
  'nationwide',
];

/**
 * A seller's published delivery times, one range per tier. A tier the seller
 * left unset is simply absent — resolution falls back to the standard for
 * that tier, never to a neighbour tier's numbers.
 */
export interface SellerDeliveryTimes {
  sameCity?: DeliveryDayRange;
  sameProvince?: DeliveryDayRange;
  nationwide?: DeliveryDayRange;
}

function validRange(value: unknown): DeliveryDayRange | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const { min, max } = value as { min?: unknown; max?: unknown };
  if (typeof min !== 'number' || typeof max !== 'number') return undefined;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  const lo = Math.floor(min);
  const hi = Math.floor(max);
  if (lo < SELLER_DELIVERY_DAY_LIMITS.min || hi > SELLER_DELIVERY_DAY_LIMITS.max || lo > hi) {
    return undefined;
  }
  return { min: lo, max: hi };
}

/**
 * Reads a stored delivery-times bag (the `delivery_times` jsonb on the
 * seller's shipping settings) into typed ranges. Anything malformed — a
 * tier outside the 1–15 day bounds, fastest after slowest, a non-object —
 * is dropped tier by tier, so bad stored data degrades to the standard
 * quote instead of reaching a buyer.
 */
export function parseSellerDeliveryTimes(raw: unknown): SellerDeliveryTimes {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const bag = raw as Record<string, unknown>;
  const times: SellerDeliveryTimes = {};
  for (const tier of DELIVERY_REGION_TIERS) {
    const range = validRange(bag[tier]);
    if (range) times[tier] = range;
  }
  return times;
}

/** The storable shape of a seller's times: set tiers only, already valid. */
export function serializeSellerDeliveryTimes(
  times: SellerDeliveryTimes | null | undefined,
): Record<string, DeliveryDayRange> {
  if (!times) return {};
  const out: Record<string, DeliveryDayRange> = {};
  for (const tier of DELIVERY_REGION_TIERS) {
    const range = times[tier];
    if (range) out[tier] = { min: range.min, max: range.max };
  }
  return out;
}

/** True when the seller has published at least one tier. */
export function hasSellerDeliveryTimes(times: SellerDeliveryTimes | null | undefined): boolean {
  return Boolean(times && DELIVERY_REGION_TIERS.some((tier) => times[tier]));
}

function normalizePlace(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface PlaceParts {
  city?: string | null;
  state?: string | null;
}

/**
 * Which tier a buyer falls in for a seller: same city when the city names
 * match, else same province when the state names match, else nationwide.
 * Matching is exact after trimming/casing — free-text places cannot be
 * fuzzy-matched honestly — and a seller who never recorded an origin city
 * or state classifies every buyer as nationwide.
 */
export function deliveryTierFor(
  origin: PlaceParts | null | undefined,
  buyer: PlaceParts | null | undefined,
): DeliveryRegionTier {
  const originCity = normalizePlace(origin?.city);
  const buyerCity = normalizePlace(buyer?.city);
  if (originCity && buyerCity && originCity === buyerCity) return 'sameCity';
  const originState = normalizePlace(origin?.state);
  const buyerState = normalizePlace(buyer?.state);
  if (originState && buyerState && originState === buyerState) return 'sameProvince';
  return 'nationwide';
}

/**
 * The range a buyer should be quoted. With a tier (checkout, where the
 * address is known): that tier's range, or the standard when the seller
 * left the tier unset. Without a tier (the product page, where the buyer's
 * region is unknown): the seller's overall span across the tiers they did
 * set — fastest fastest to slowest slowest — or the standard when they set
 * nothing.
 */
export function resolveDeliveryRange(
  times: SellerDeliveryTimes | null | undefined,
  tier?: DeliveryRegionTier,
): DeliveryDayRange {
  if (tier) return times?.[tier] ?? STANDARD_DELIVERY_BUSINESS_DAYS;
  const set = DELIVERY_REGION_TIERS.map((t) => times?.[t]).filter(
    (range): range is DeliveryDayRange => Boolean(range),
  );
  if (set.length === 0) return STANDARD_DELIVERY_BUSINESS_DAYS;
  return {
    min: Math.min(...set.map((range) => range.min)),
    max: Math.max(...set.map((range) => range.max)),
  };
}

/** "2–4 business days" / "1 business day" / "3 business days". */
export function formatDeliveryRange(range: DeliveryDayRange): string {
  if (range.min === range.max) {
    return range.min === 1 ? '1 business day' : `${range.min} business days`;
  }
  return `${range.min}–${range.max} business days`;
}

/** Adds `days` business days (Mon–Fri) to `from`, not counting `from` itself. */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

export interface DeliveryWindow {
  start: Date;
  end: Date;
}

/** The estimated arrival window for a delivery in `range` ordered on `from`. */
export function estimatedDeliveryWindow(
  from: Date = new Date(),
  range: DeliveryDayRange = STANDARD_DELIVERY_BUSINESS_DAYS,
): DeliveryWindow {
  return {
    start: addBusinessDays(from, range.min),
    end: addBusinessDays(from, range.max),
  };
}

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Fri 16 Oct – Tue 20 Oct" for a delivery in `range` ordered today. */
export function formatDeliveryWindow(
  from: Date = new Date(),
  range: DeliveryDayRange = STANDARD_DELIVERY_BUSINESS_DAYS,
): string {
  const { start, end } = estimatedDeliveryWindow(from, range);
  return `${dayFormat.format(start)} – ${dayFormat.format(end)}`;
}
