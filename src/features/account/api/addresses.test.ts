import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as addresses from './addresses';
import { addressRow, supabaseDouble } from '../../../test/supabase-double';
import type { NewAddressInput } from '../types';

const USER = 'user-1';
const OTHER = 'user-2';

const HOME: NewAddressInput = {
  type: 'home',
  label: 'Home',
  fullName: 'Alex Buyer',
  phone: '+92 300 1234567',
  street: '12 Canal Road',
  city: 'Lahore',
  state: 'Punjab',
  zipCode: '54000',
  country: 'Pakistan',
  isDefault: false,
};

const WORK: NewAddressInput = {
  ...HOME,
  type: 'work',
  label: 'Work',
  street: '4-B Main Boulevard, Gulberg III',
};

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
});

describe('fetchAddresses', () => {
  it('reads only the signed-in customer’s own addresses, oldest first, mapped to the UI shape', async () => {
    supabaseDouble.seedAddress(
      addressRow({ id: 'work', type: 'work', label: 'Work', zip_code: '54000', created_at: '2026-10-06T00:00:00.000Z' }),
    );
    supabaseDouble.seedAddress(addressRow({ id: 'home', created_at: '2026-10-05T00:00:00.000Z' }));
    supabaseDouble.seedAddress(addressRow({ id: 'theirs', user_id: OTHER }));

    const list = await addresses.fetchAddresses();

    expect(list.map((a) => a.id)).toEqual(['home', 'work']);
    expect(list[0]).toMatchObject({
      id: 'home',
      type: 'home',
      fullName: 'Alex Buyer',
      zipCode: '54000',
      isDefault: false,
      createdAt: '2026-10-05T00:00:00.000Z',
    });
  });

  it('returns an honest empty book for a new account', async () => {
    await expect(addresses.fetchAddresses()).resolves.toEqual([]);
  });

  it('refuses to read an address book without a session', async () => {
    supabaseDouble.authState.session = null;

    await expect(addresses.fetchAddresses()).rejects.toThrow('Sign in to manage your saved addresses.');
  });

  it('surfaces a failed read instead of an empty book', async () => {
    supabaseDouble.failures.user_addresses = 'relation does not exist';

    await expect(addresses.fetchAddresses()).rejects.toThrow(
      'Failed to load your addresses: relation does not exist',
    );
  });
});

describe('createAddress', () => {
  it('makes the first saved address the default, however the form was left', async () => {
    const created = await addresses.createAddress(HOME);

    expect(created.isDefault).toBe(true);
    expect(supabaseDouble.tables.user_addresses).toHaveLength(1);
    expect(supabaseDouble.tables.user_addresses[0]).toMatchObject({
      user_id: USER,
      full_name: 'Alex Buyer',
      zip_code: '54000',
      is_default: true,
    });
  });

  it('keeps the existing default when a later address is saved without the flag', async () => {
    await addresses.createAddress(HOME);
    const second = await addresses.createAddress(WORK);

    expect(second.isDefault).toBe(false);
    const defaults = supabaseDouble.tables.user_addresses.filter((row) => row.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].type).toBe('home');
  });

  it('unsets the old default before a new one is written', async () => {
    await addresses.createAddress(HOME);
    await addresses.createAddress({ ...WORK, isDefault: true });

    const defaults = supabaseDouble.tables.user_addresses.filter((row) => row.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].type).toBe('work');
  });
});

describe('updateAddress', () => {
  it('writes the edited fields to the caller’s row only', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'mine' }));
    supabaseDouble.seedAddress(addressRow({ id: 'theirs', user_id: OTHER }));

    await addresses.updateAddress('mine', { street: '99 New Road', city: 'Karachi' });

    expect(supabaseDouble.tables.user_addresses.find((row) => row.id === 'mine')).toMatchObject({
      street: '99 New Road',
      city: 'Karachi',
    });
    expect(supabaseDouble.tables.user_addresses.find((row) => row.id === 'theirs')?.street).toBe('12 Canal Road');
  });

  it('moves the default when an edit flags another address', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'home', is_default: true }));
    supabaseDouble.seedAddress(addressRow({ id: 'work', type: 'work' }));

    await addresses.updateAddress('work', { isDefault: true });

    const defaults = supabaseDouble.tables.user_addresses.filter((row) => row.is_default);
    expect(defaults.map((row) => row.id)).toEqual(['work']);
  });
});

describe('setDefaultAddress', () => {
  it('leaves exactly one default, and never touches another customer’s rows', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'home', is_default: true }));
    supabaseDouble.seedAddress(addressRow({ id: 'work', type: 'work' }));
    supabaseDouble.seedAddress(addressRow({ id: 'theirs', user_id: OTHER, is_default: true }));

    await addresses.setDefaultAddress('work');

    const mine = supabaseDouble.tables.user_addresses.filter((row) => row.user_id === USER);
    expect(mine.filter((row) => row.is_default).map((row) => row.id)).toEqual(['work']);
    expect(supabaseDouble.tables.user_addresses.find((row) => row.id === 'theirs')?.is_default).toBe(true);
  });
});

describe('deleteAddress', () => {
  it('promotes the oldest remaining address when the default is deleted', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'oldest', created_at: '2026-10-01T00:00:00.000Z' }));
    supabaseDouble.seedAddress(
      addressRow({ id: 'default', is_default: true, created_at: '2026-10-03T00:00:00.000Z' }),
    );
    supabaseDouble.seedAddress(addressRow({ id: 'newer', created_at: '2026-10-04T00:00:00.000Z' }));

    await addresses.deleteAddress('default');

    const remaining = supabaseDouble.tables.user_addresses;
    expect(remaining.map((row) => row.id).sort()).toEqual(['newer', 'oldest']);
    expect(remaining.find((row) => row.id === 'oldest')?.is_default).toBe(true);
    expect(remaining.find((row) => row.id === 'newer')?.is_default).toBe(false);
  });

  it('keeps the default when a non-default address is deleted', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'home', is_default: true }));
    supabaseDouble.seedAddress(addressRow({ id: 'work', type: 'work' }));

    await addresses.deleteAddress('work');

    expect(supabaseDouble.tables.user_addresses).toHaveLength(1);
    expect(supabaseDouble.tables.user_addresses[0]).toMatchObject({ id: 'home', is_default: true });
  });

  it('cannot delete another customer’s address', async () => {
    supabaseDouble.seedAddress(addressRow({ id: 'theirs', user_id: OTHER }));

    await addresses.deleteAddress('theirs');

    expect(supabaseDouble.tables.user_addresses).toHaveLength(1);
  });
});
