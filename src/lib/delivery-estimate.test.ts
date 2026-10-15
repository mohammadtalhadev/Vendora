import { describe, expect, it } from 'vitest';
import {
  STANDARD_DELIVERY_BUSINESS_DAYS,
  deliveryTierFor,
  formatDeliveryRange,
  formatDeliveryWindow,
  hasSellerDeliveryTimes,
  parseSellerDeliveryTimes,
  resolveDeliveryRange,
  serializeSellerDeliveryTimes,
  type SellerDeliveryTimes,
} from './delivery-estimate';

describe('parseSellerDeliveryTimes', () => {
  it('reads the tiers a seller set and leaves the rest absent', () => {
    expect(
      parseSellerDeliveryTimes({
        sameCity: { min: 1, max: 2 },
        nationwide: { min: 3, max: 5 },
      }),
    ).toEqual({ sameCity: { min: 1, max: 2 }, nationwide: { min: 3, max: 5 } });
  });

  it('treats anything that is not an object bag as "nothing set"', () => {
    expect(parseSellerDeliveryTimes(null)).toEqual({});
    expect(parseSellerDeliveryTimes(undefined)).toEqual({});
    expect(parseSellerDeliveryTimes('sameCity')).toEqual({});
    expect(parseSellerDeliveryTimes([{ min: 1, max: 2 }])).toEqual({});
    expect(parseSellerDeliveryTimes({})).toEqual({});
  });

  it('drops a tier whose fastest day is after its slowest', () => {
    expect(parseSellerDeliveryTimes({ sameCity: { min: 4, max: 2 } })).toEqual({});
  });

  it('drops tiers outside the 1–15 business-day bounds instead of clamping them', () => {
    expect(parseSellerDeliveryTimes({ sameCity: { min: 0, max: 2 } })).toEqual({});
    expect(parseSellerDeliveryTimes({ nationwide: { min: 2, max: 16 } })).toEqual({});
    expect(
      parseSellerDeliveryTimes({
        sameProvince: { min: 1, max: 15 },
        nationwide: { min: 2, max: 99 },
      }),
    ).toEqual({ sameProvince: { min: 1, max: 15 } });
  });

  it('drops tiers with non-numeric or fractional-only shapes but floors real numbers', () => {
    expect(parseSellerDeliveryTimes({ sameCity: { min: '1', max: '2' } })).toEqual({});
    expect(parseSellerDeliveryTimes({ sameCity: { min: 1.9, max: 2.1 } })).toEqual({
      sameCity: { min: 1, max: 2 },
    });
  });

  it('ignores unknown keys in the bag', () => {
    expect(
      parseSellerDeliveryTimes({ sameCity: { min: 1, max: 1 }, express: { min: 1, max: 1 } }),
    ).toEqual({ sameCity: { min: 1, max: 1 } });
  });
});

describe('serializeSellerDeliveryTimes', () => {
  it('keeps only the set tiers, as plain ranges', () => {
    const times: SellerDeliveryTimes = { sameCity: { min: 1, max: 2 } };
    expect(serializeSellerDeliveryTimes(times)).toEqual({ sameCity: { min: 1, max: 2 } });
    expect(serializeSellerDeliveryTimes({})).toEqual({});
    expect(serializeSellerDeliveryTimes(null)).toEqual({});
  });

  it('round-trips through the parser', () => {
    const times = parseSellerDeliveryTimes({
      sameCity: { min: 1, max: 2 },
      sameProvince: { min: 2, max: 4 },
      nationwide: { min: 4, max: 7 },
    });
    expect(parseSellerDeliveryTimes(serializeSellerDeliveryTimes(times))).toEqual(times);
  });
});

describe('hasSellerDeliveryTimes', () => {
  it('is true only when at least one tier is set', () => {
    expect(hasSellerDeliveryTimes({ nationwide: { min: 3, max: 5 } })).toBe(true);
    expect(hasSellerDeliveryTimes({})).toBe(false);
    expect(hasSellerDeliveryTimes(null)).toBe(false);
    expect(hasSellerDeliveryTimes(undefined)).toBe(false);
  });
});

describe('deliveryTierFor', () => {
  const origin = { city: 'Lahore', state: 'Punjab' };

  it('classifies a buyer in the seller’s city as sameCity, ignoring case and spacing', () => {
    expect(deliveryTierFor(origin, { city: '  lahore ', state: 'Punjab' })).toBe('sameCity');
  });

  it('classifies a buyer elsewhere in the seller’s province as sameProvince', () => {
    expect(deliveryTierFor(origin, { city: 'Multan', state: 'punjab' })).toBe('sameProvince');
  });

  it('classifies any other buyer as nationwide', () => {
    expect(deliveryTierFor(origin, { city: 'Karachi', state: 'Sindh' })).toBe('nationwide');
  });

  it('never claims proximity the data cannot support', () => {
    // The seller never recorded an origin: every buyer is nationwide.
    expect(deliveryTierFor({ city: '', state: '' }, { city: 'Lahore', state: 'Punjab' })).toBe(
      'nationwide',
    );
    // A blank buyer city cannot be "same city" even when the state matches.
    expect(deliveryTierFor(origin, { city: '', state: 'Punjab' })).toBe('sameProvince');
    // Nothing known at all.
    expect(deliveryTierFor(null, null)).toBe('nationwide');
  });
});

describe('resolveDeliveryRange', () => {
  const times: SellerDeliveryTimes = {
    sameCity: { min: 1, max: 2 },
    nationwide: { min: 3, max: 6 },
  };

  it('falls back to the platform standard when the seller set nothing', () => {
    expect(resolveDeliveryRange(null)).toEqual(STANDARD_DELIVERY_BUSINESS_DAYS);
    expect(resolveDeliveryRange({})).toEqual(STANDARD_DELIVERY_BUSINESS_DAYS);
    expect(resolveDeliveryRange({}, 'sameCity')).toEqual(STANDARD_DELIVERY_BUSINESS_DAYS);
  });

  it('returns the buyer’s tier when a tier is known', () => {
    expect(resolveDeliveryRange(times, 'sameCity')).toEqual({ min: 1, max: 2 });
    expect(resolveDeliveryRange(times, 'nationwide')).toEqual({ min: 3, max: 6 });
  });

  it('falls back to the standard for a tier the seller left unset — not to a neighbour tier', () => {
    expect(resolveDeliveryRange(times, 'sameProvince')).toEqual(
      STANDARD_DELIVERY_BUSINESS_DAYS,
    );
  });

  it('spans the set tiers when no tier is known (the product-page quote)', () => {
    expect(resolveDeliveryRange(times)).toEqual({ min: 1, max: 6 });
    expect(resolveDeliveryRange({ sameProvince: { min: 2, max: 3 } })).toEqual({ min: 2, max: 3 });
  });
});

describe('formatDeliveryRange', () => {
  it('renders ranges and single days plainly', () => {
    expect(formatDeliveryRange({ min: 2, max: 4 })).toBe('2–4 business days');
    expect(formatDeliveryRange({ min: 1, max: 1 })).toBe('1 business day');
    expect(formatDeliveryRange({ min: 3, max: 3 })).toBe('3 business days');
  });
});

describe('formatDeliveryWindow with a seller range', () => {
  // Monday 12 Oct 2026 (local), so business-day arithmetic skips no weekend.
  const monday = new Date(2026, 9, 12);

  it('keeps the standard window when no range is passed', () => {
    expect(formatDeliveryWindow(monday)).toBe('Wed 14 Oct – Fri 16 Oct');
  });

  it('dates the seller’s range instead of the standard', () => {
    expect(formatDeliveryWindow(monday, { min: 1, max: 2 })).toBe('Tue 13 Oct – Wed 14 Oct');
    expect(formatDeliveryWindow(monday, { min: 1, max: 1 })).toBe('Tue 13 Oct – Tue 13 Oct');
  });
});
