/**
 * Delivery-time estimates — the single source every customer surface reads.
 *
 * No per-seller transit data exists anywhere in the schema: vendor shipping
 * settings record a dispatch window and fees, and checkout pricing defines
 * fees only. The one customer-facing delivery-time statement the site already
 * makes is the product FAQ ("Standard delivery completes within 2–4 business
 * days"), so that range is canonised here and every surface — product page,
 * checkout summary, the FAQ itself — derives from this module instead of
 * restating (and drifting) its own numbers.
 */
export const STANDARD_DELIVERY_BUSINESS_DAYS = { min: 2, max: 4 } as const;

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

/** The estimated arrival window for a standard delivery ordered on `from`. */
export function estimatedDeliveryWindow(from: Date = new Date()): DeliveryWindow {
  return {
    start: addBusinessDays(from, STANDARD_DELIVERY_BUSINESS_DAYS.min),
    end: addBusinessDays(from, STANDARD_DELIVERY_BUSINESS_DAYS.max),
  };
}

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Fri 16 Oct – Tue 20 Oct" for a standard delivery ordered today. */
export function formatDeliveryWindow(from: Date = new Date()): string {
  const { start, end } = estimatedDeliveryWindow(from);
  return `${dayFormat.format(start)} – ${dayFormat.format(end)}`;
}
