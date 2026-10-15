import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as shipping from './shipping';
import { prefsRow, shippingRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const SELLER = 'vendor-1';
const STORE = 'store-1';
const OTHER_STORE = 'store-2';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: SELLER, email: 'seller@demo.test' },
  };
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: SELLER, store_name: 'Nova Tech' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: OTHER_STORE, store_name: 'Other Shop' }));
});

describe('fetchShippingSettings', () => {
  it('shows a blank form for a store that has never saved one, rather than invented rates', async () => {
    const settings = await shipping.fetchShippingSettings();

    expect(settings).toEqual({
      freeShippingEnabled: false,
      freeShippingThreshold: 0,
      standardRate: 0,
      expressRate: 0,
      warehouseName: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      operatingHours: '',
      gateCode: '',
      slaWindow: '',
      deliveryTimes: {},
    });
  });

  it('reads the store’s published delivery times, dropping a malformed tier', async () => {
    supabaseDouble.seedShippingSettings(
      shippingRow({
        vendor_id: STORE,
        delivery_times: {
          sameCity: { min: 1, max: 2 },
          sameProvince: { min: 5, max: 3 },
          nationwide: { min: 3, max: 6 },
        },
      }),
    );

    const settings = await shipping.fetchShippingSettings();

    expect(settings.deliveryTimes).toEqual({
      sameCity: { min: 1, max: 2 },
      nationwide: { min: 3, max: 6 },
    });
  });

  it('reads the store’s own row', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: STORE, standard_rate: 7.25, sla_window: '24h' }));
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: OTHER_STORE, standard_rate: 99 }));

    const settings = await shipping.fetchShippingSettings();

    expect(settings).toMatchObject({ standardRate: 7.25, slaWindow: '24h', warehouseName: 'Demo Warehouse' });
  });

  it('reports a denied read', async () => {
    supabaseDouble.failures.vendor_shipping_settings = 'row-level security';

    await expect(shipping.fetchShippingSettings()).rejects.toThrow(/Failed to load your shipping settings/);
  });
});

describe('saveShippingSettings', () => {
  it('keeps one row per store and returns what was stored', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: STORE }));

    const saved = await shipping.saveShippingSettings({ standardRate: 9.5, slaWindow: 'custom' });

    expect(saved).toMatchObject({ standardRate: 9.5, slaWindow: 'custom', expressRate: 24 });
    expect(supabaseDouble.tables.vendor_shipping_settings).toHaveLength(1);
  });

  it('creates the row on a store that has never had one', async () => {
    await shipping.saveShippingSettings({ freeShippingEnabled: true, freeShippingThreshold: 200 });

    expect(supabaseDouble.tables.vendor_shipping_settings).toHaveLength(1);
    expect(supabaseDouble.tables.vendor_shipping_settings[0]).toMatchObject({
      vendor_id: STORE,
      free_shipping_enabled: true,
      free_shipping_threshold: 200,
    });
  });

  it('stores delivery times on the same row and reads them back', async () => {
    supabaseDouble.seedShippingSettings(shippingRow({ vendor_id: STORE }));

    const saved = await shipping.saveShippingSettings({
      deliveryTimes: { sameCity: { min: 1, max: 2 }, nationwide: { min: 3, max: 5 } },
    });

    expect(saved.deliveryTimes).toEqual({
      sameCity: { min: 1, max: 2 },
      nationwide: { min: 3, max: 5 },
    });
    expect(supabaseDouble.tables.vendor_shipping_settings).toHaveLength(1);
    expect(supabaseDouble.tables.vendor_shipping_settings[0].delivery_times).toEqual({
      sameCity: { min: 1, max: 2 },
      nationwide: { min: 3, max: 5 },
    });
  });

  it('clears every tier when the seller saves an empty set', async () => {
    supabaseDouble.seedShippingSettings(
      shippingRow({ vendor_id: STORE, delivery_times: { sameCity: { min: 1, max: 2 } } }),
    );

    const saved = await shipping.saveShippingSettings({ deliveryTimes: {} });

    expect(saved.deliveryTimes).toEqual({});
    expect(supabaseDouble.tables.vendor_shipping_settings[0].delivery_times).toEqual({});
  });
});

describe('notification preferences', () => {
  it('falls back to the database defaults when nothing is stored', async () => {
    const prefs = await shipping.fetchNotificationPrefs();

    expect(prefs).toEqual({
      smsDispatch: false,
      lowInventoryAlert: true,
      rmaPushAlert: true,
      dailyDigest: false,
    });
  });

  it('merges a switch change into the stored bag', async () => {
    supabaseDouble.seedNotificationPrefs(prefsRow({ vendor_id: STORE }));

    const prefs = await shipping.saveNotificationPrefs({ dailyDigest: true });

    expect(prefs).toEqual({
      smsDispatch: false,
      lowInventoryAlert: true,
      rmaPushAlert: true,
      dailyDigest: true,
    });
    expect(supabaseDouble.tables.vendor_notification_prefs).toHaveLength(1);
  });
});
