import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as payments from './payments';
import { paymentMethodRow, supabaseDouble } from '../../../test/supabase-double';
import type { NewPaymentMethodInput } from '../types';

const USER = 'user-1';
const OTHER = 'user-2';

const VISA: NewPaymentMethodInput = {
  type: 'card',
  brand: 'Visa',
  cardholderName: 'Alex Buyer',
  last4: '4242',
  expiryMonth: '12',
  expiryYear: '28',
  isDefault: false,
};

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = { access_token: 't', user: { id: USER, email: 'buyer@demo.test' } };
});

describe('fetchPaymentMethods', () => {
  it('reads only the signed-in customer’s own methods, mapped to the UI shape', async () => {
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'mine' }));
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'theirs', user_id: OTHER }));

    const list = await payments.fetchPaymentMethods();

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'mine',
      type: 'card',
      brand: 'Visa',
      cardholderName: 'Alex Buyer',
      last4: '4242',
      expiryMonth: '12',
      expiryYear: '28',
      isDefault: false,
    });
  });

  it('reads a cash-on-delivery preference back as a cod method with no card fields', async () => {
    supabaseDouble.seedPaymentMethod(
      paymentMethodRow({
        id: 'cod',
        type: 'cod',
        brand: 'Cash on Delivery',
        cardholder_name: null,
        last4: null,
        expiry_month: null,
        expiry_year: null,
      }),
    );

    const list = await payments.fetchPaymentMethods();

    expect(list[0]).toMatchObject({ id: 'cod', type: 'cod', brand: 'Cash on Delivery' });
    expect(list[0].cardholderName).toBeUndefined();
    expect(list[0].last4).toBeUndefined();
  });

  it('refuses to read payment methods without a session', async () => {
    supabaseDouble.authState.session = null;

    await expect(payments.fetchPaymentMethods()).rejects.toThrow('Sign in to manage your payment methods.');
  });

  it('surfaces a failed read instead of an empty list', async () => {
    supabaseDouble.failures.user_payment_methods = 'relation does not exist';

    await expect(payments.fetchPaymentMethods()).rejects.toThrow(
      'Failed to load your payment methods: relation does not exist',
    );
  });
});

describe('createPaymentMethod', () => {
  it('stores display metadata only - the row never carries a card number or CVV', async () => {
    const created = await payments.createPaymentMethod(VISA);

    expect(created).toMatchObject({ brand: 'Visa', last4: '4242', isDefault: true });
    const stored = supabaseDouble.tables.user_payment_methods[0];
    expect(stored).toMatchObject({ user_id: USER, brand: 'Visa', last4: '4242', is_default: true });
    expect(Object.keys(stored)).not.toContain('card_number');
    expect(Object.keys(stored)).not.toContain('cvv');
    expect(Object.values(stored)).not.toContain('4242424242424242');
  });

  it('makes the first saved method the default and unsets it when a flagged one follows', async () => {
    await payments.createPaymentMethod(VISA);
    const second = await payments.createPaymentMethod({
      type: 'cod',
      brand: 'Cash on Delivery',
      isDefault: true,
    });

    expect(second.isDefault).toBe(true);
    const defaults = supabaseDouble.tables.user_payment_methods.filter((row) => row.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].type).toBe('cod');
  });
});

describe('setDefaultPaymentMethod', () => {
  it('leaves exactly one default on the caller’s rows', async () => {
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'visa', is_default: true }));
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'mc', brand: 'Mastercard', last4: '8812' }));
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'theirs', user_id: OTHER, is_default: true }));

    await payments.setDefaultPaymentMethod('mc');

    const mine = supabaseDouble.tables.user_payment_methods.filter((row) => row.user_id === USER);
    expect(mine.filter((row) => row.is_default).map((row) => row.id)).toEqual(['mc']);
    expect(supabaseDouble.tables.user_payment_methods.find((row) => row.id === 'theirs')?.is_default).toBe(
      true,
    );
  });
});

describe('deletePaymentMethod', () => {
  it('promotes the oldest remaining method when the default is deleted', async () => {
    supabaseDouble.seedPaymentMethod(
      paymentMethodRow({ id: 'oldest', created_at: '2026-10-01T00:00:00.000Z' }),
    );
    supabaseDouble.seedPaymentMethod(
      paymentMethodRow({ id: 'default', is_default: true, created_at: '2026-10-03T00:00:00.000Z' }),
    );

    await payments.deletePaymentMethod('default');

    expect(supabaseDouble.tables.user_payment_methods).toHaveLength(1);
    expect(supabaseDouble.tables.user_payment_methods[0]).toMatchObject({ id: 'oldest', is_default: true });
  });

  it('cannot delete another customer’s method', async () => {
    supabaseDouble.seedPaymentMethod(paymentMethodRow({ id: 'theirs', user_id: OTHER }));

    await payments.deletePaymentMethod('theirs');

    expect(supabaseDouble.tables.user_payment_methods).toHaveLength(1);
  });
});
