import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { sendContactMessage, subscribeToNewsletter } from './public-forms';
import { supabaseDouble } from '../../../test/supabase-double';

describe('public form inboxes', () => {
  beforeEach(() => {
    supabaseDouble.reset();
  });

  it('stores a newsletter signup, normalised to lowercase', async () => {
    const result = await subscribeToNewsletter('  Ayesha@Example.com ');
    expect(result).toBe('subscribed');
    expect(supabaseDouble.tables.newsletter_subscribers).toHaveLength(1);
    expect(supabaseDouble.tables.newsletter_subscribers[0].email).toBe('ayesha@example.com');
  });

  it('answers already-subscribed for a duplicate email instead of erroring', async () => {
    await subscribeToNewsletter('ayesha@example.com');
    const again = await subscribeToNewsletter('AYESHA@example.com');
    expect(again).toBe('already-subscribed');
    expect(supabaseDouble.tables.newsletter_subscribers).toHaveLength(1);
  });

  it('stores a contact message with a null order ref when none is given', async () => {
    await sendContactMessage({
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
      topic: 'buyer-care',
      message: 'Where is my parcel?',
    });
    expect(supabaseDouble.tables.contact_messages).toHaveLength(1);
    expect(supabaseDouble.tables.contact_messages[0]).toMatchObject({
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
      topic: 'buyer-care',
      order_ref: null,
      message: 'Where is my parcel?',
    });
  });

  it('rejects an over-length contact message before it reaches the table', async () => {
    await expect(
      sendContactMessage({
        name: 'Ayesha Khan',
        email: 'ayesha@example.com',
        topic: 'buyer-care',
        message: 'x'.repeat(4001),
      }),
    ).rejects.toThrow('Message must be 4000 characters or fewer.');
    expect(supabaseDouble.tables.contact_messages).toHaveLength(0);
  });

  it('rejects an over-length newsletter email', async () => {
    await expect(subscribeToNewsletter(`${'a'.repeat(250)}@example.com`)).rejects.toThrow(
      'Email must be 254 characters or fewer.',
    );
    expect(supabaseDouble.tables.newsletter_subscribers).toHaveLength(0);
  });

  it('keeps a provided order ref on the contact message', async () => {
    await sendContactMessage({
      name: 'Bilal',
      email: 'bilal@example.com',
      topic: 'seller-ops',
      orderRef: ' 9f2c-order-id ',
      message: 'Please check this order.',
    });
    expect(supabaseDouble.tables.contact_messages[0].order_ref).toBe('9f2c-order-id');
  });
});
