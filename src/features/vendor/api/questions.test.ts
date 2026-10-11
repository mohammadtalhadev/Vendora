import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import * as questions from './questions';
import { productRow, questionRow, storeRow, supabaseDouble } from '../../../test/supabase-double';

const SELLER = 'vendor-1';
const STORE = 'store-1';
const OTHER_STORE = 'store-2';
const PRODUCT = '00000000-0000-4000-8000-000000000101';
const QUESTION = '00000000-0000-4000-8000-000000000701';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.authState.session = {
    access_token: 't',
    user: { id: SELLER, email: 'seller@demo.test' },
  };
  supabaseDouble.seedVendorProfile(storeRow({ id: STORE, user_id: SELLER, store_name: 'Nova Tech' }));
  supabaseDouble.seedVendorProfile(storeRow({ id: OTHER_STORE, store_name: 'Other Shop' }));
  supabaseDouble.seedProduct(
    productRow({ id: PRODUCT, title: 'Reference Headphones', slug: 'reference-headphones', seller_id: STORE }),
  );
});

describe('fetchVendorQuestions', () => {
  it('shows each question with the listing it was asked about, newest first', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: STORE, created_at: '2026-10-07T00:00:00.000Z' }));
    supabaseDouble.seedQuestion(
      questionRow({
        id: 'q-2',
        product_id: PRODUCT,
        vendor_id: STORE,
        question: 'Is the warranty international?',
        answer: 'Yes, two years worldwide.',
        published: true,
        answered_at: '2026-10-08T00:00:00.000Z',
        created_at: '2026-10-06T00:00:00.000Z',
      }),
    );
    supabaseDouble.seedQuestion(questionRow({ id: 'q-3', vendor_id: OTHER_STORE }));

    const list = await questions.fetchVendorQuestions();

    expect(list.map((question) => question.id)).toEqual([QUESTION, 'q-2']);
    expect(list[0]).toMatchObject({
      productId: PRODUCT,
      productTitle: 'Reference Headphones',
      productSlug: 'reference-headphones',
      productImage: 'https://example.test/headphones.png',
      customerName: 'Alex Buyer',
      answer: undefined,
      published: false,
    });
    expect(list[1]).toMatchObject({ answer: 'Yes, two years worldwide.', published: true });
  });

  it('reports a denied read rather than an empty inbox', async () => {
    supabaseDouble.failures.product_qa = 'row-level security';

    await expect(questions.fetchVendorQuestions()).rejects.toThrow(/Failed to load your questions/);
  });
});

describe('answerQuestion', () => {
  it('writes the answer and the publish flag, and stamps when it was answered', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: STORE }));

    const answered = await questions.answerQuestion(QUESTION, 'It ships with a 2 m cable.');

    expect(answered).toMatchObject({
      id: QUESTION,
      answer: 'It ships with a 2 m cable.',
      published: true,
      productTitle: 'Reference Headphones',
    });
    expect(supabaseDouble.tables.product_qa[0].answered_at).toBeTruthy();
  });

  it('will not answer a question belonging to another store', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, vendor_id: OTHER_STORE }));

    await expect(questions.answerQuestion(QUESTION, 'Not mine to answer.')).rejects.toThrow(
      /This question is not yours to answer/,
    );
    expect(supabaseDouble.tables.product_qa[0].answer).toBeNull();
  });

  it('can hold an answer back from the listing', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: STORE }));

    const held = await questions.answerQuestion(QUESTION, 'Draft reply.', false);

    expect(held.published).toBe(false);
  });
});

describe('setQuestionPublished', () => {
  it('hides an answer without deleting it', async () => {
    supabaseDouble.seedQuestion(
      questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: STORE, answer: 'Published reply.', published: true }),
    );

    const hidden = await questions.setQuestionPublished(QUESTION, false);

    expect(hidden).toMatchObject({ published: false, answer: 'Published reply.' });
  });
});
