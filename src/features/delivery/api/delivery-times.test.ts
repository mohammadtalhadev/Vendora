import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchSellerDeliveryTimes } from './delivery-times';
import { supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
});

describe('fetchSellerDeliveryTimes', () => {
  it('returns the published times and origin for the stores asked about', async () => {
    supabaseDouble.seedStoreDeliveryTime({
      vendor_id: 'store-1',
      delivery_times: { sameCity: { min: 1, max: 2 }, nationwide: { min: 3, max: 5 } },
      origin_city: 'Lahore',
      origin_state: 'Punjab',
    });
    supabaseDouble.seedStoreDeliveryTime({
      vendor_id: 'store-2',
      delivery_times: {},
      origin_city: 'Karachi',
      origin_state: 'Sindh',
    });

    const profiles = await fetchSellerDeliveryTimes(['store-1', 'store-2', 'store-3']);

    expect(profiles.get('store-1')).toEqual({
      vendorId: 'store-1',
      times: { sameCity: { min: 1, max: 2 }, nationwide: { min: 3, max: 5 } },
      originCity: 'Lahore',
      originState: 'Punjab',
    });
    // A store with a settings row but no times set still profiles, with none set.
    expect(profiles.get('store-2')?.times).toEqual({});
    // A store with no settings row at all has no profile: the caller quotes the standard.
    expect(profiles.has('store-3')).toBe(false);
  });

  it('drops malformed stored tiers instead of quoting them', async () => {
    supabaseDouble.seedStoreDeliveryTime({
      vendor_id: 'store-1',
      delivery_times: { sameCity: { min: 9, max: 2 }, nationwide: { min: 3, max: 5 } },
      origin_city: 'Lahore',
      origin_state: 'Punjab',
    });

    const profiles = await fetchSellerDeliveryTimes(['store-1']);

    expect(profiles.get('store-1')?.times).toEqual({ nationwide: { min: 3, max: 5 } });
  });

  it('never rejects: a missing view (pre-migration) reads as "no seller times"', async () => {
    supabaseDouble.failures.store_delivery_times = 'relation "store_delivery_times" does not exist';

    await expect(fetchSellerDeliveryTimes(['store-1'])).resolves.toEqual(new Map());
  });

  it('does no work for an empty store list', async () => {
    await expect(fetchSellerDeliveryTimes([])).resolves.toEqual(new Map());
  });
});
