import { describe, it, expect, beforeEach, vi } from 'vitest';

// WorkspaceLayout's sign-out needs the auth provider; these tests never click it.
vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { VendorQAPage } from './VendorQAPage';
import { renderWorkspace, signInVendor } from '../test/vendor-render';
import { productRow, questionRow, storeRow, supabaseDouble } from '../test/supabase-double';

const PRODUCT = '00000000-0000-4000-8000-000000000101';
const QUESTION = '00000000-0000-4000-8000-000000000701';

beforeEach(() => {
  supabaseDouble.reset();
  signInVendor();
  supabaseDouble.seedVendorProfile(storeRow({ id: 'store-2', store_name: 'Other Shop' }));
  supabaseDouble.seedProduct(productRow({ id: PRODUCT, seller_id: 'store-1' }));
});

describe('VendorQAPage', () => {
  it('lists the questions buyers asked on this store’s listings, newest first', async () => {
    supabaseDouble.seedQuestion(
      questionRow({
        id: QUESTION,
        product_id: PRODUCT,
        vendor_id: 'store-1',
        created_at: '2026-10-08T00:00:00.000Z',
      }),
    );
    supabaseDouble.seedQuestion(
      questionRow({
        id: 'q-older',
        product_id: PRODUCT,
        vendor_id: 'store-1',
        question: 'Is the warranty international?',
        answer: 'Yes, two years worldwide.',
        published: true,
        answered_at: '2026-10-07T00:00:00.000Z',
        created_at: '2026-10-06T00:00:00.000Z',
      }),
    );
    supabaseDouble.seedQuestion(
      questionRow({
        id: 'q-other',
        vendor_id: 'store-2',
        question: 'A question on another store’s listing',
      }),
    );

    renderWorkspace(<VendorQAPage />);

    await waitFor(() =>
      expect(screen.getByText(/Does this work with a USB-C hub\?/)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Unanswered 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Answered 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 2' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Reference Headphones' })).toHaveAttribute(
      'href',
      '/products/reference-headphones',
    );

    // Another store's inbox is not this one's to read.
    expect(screen.queryByText(/another store’s listing/)).not.toBeInTheDocument();
  });

  it('writes an answer to the database and publishes it on the listing', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: 'store-1' }));
    renderWorkspace(<VendorQAPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Compose Answer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Compose Answer/i }));

    fireEvent.change(screen.getByPlaceholderText(/Provide a clear, helpful response/i), {
      target: { value: 'Yes, it charges over USB-C.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() =>
      expect(screen.getByText(/Answered Alex Buyer's question and published it/i)).toBeInTheDocument(),
    );
    expect(supabaseDouble.tables.product_qa[0]).toMatchObject({
      answer: 'Yes, it charges over USB-C.',
      published: true,
    });

    // The queue moves the question to the Answered tab; the tab counts are its own rows.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answered 1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Answered 1' }));
    expect(screen.getByText('Yes, it charges over USB-C.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide from listing/i })).toBeInTheDocument();
  });

  it('reports a write the database refused instead of pretending it saved', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: 'store-1' }));
    renderWorkspace(<VendorQAPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Compose Answer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Compose Answer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Provide a clear, helpful response/i), {
      target: { value: 'An answer.' },
    });

    supabaseDouble.failures.product_qa = 'row-level security';
    fireEvent.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() => expect(screen.getByText(/Failed to save the answer/i)).toBeInTheDocument());
    expect(supabaseDouble.tables.product_qa[0].answer).toBeNull();
  });

  it('hides an answer from the listing without deleting it', async () => {
    supabaseDouble.seedQuestion(
      questionRow({
        id: QUESTION,
        product_id: PRODUCT,
        vendor_id: 'store-1',
        question: 'Is the warranty international?',
        answer: 'Yes, two years worldwide.',
        published: true,
        answered_at: '2026-10-07T00:00:00.000Z',
      }),
    );
    renderWorkspace(<VendorQAPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Answered 1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Answered 1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Hide from listing/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Hide from listing/i }));

    await waitFor(() => expect(screen.getByText(/The answer is hidden from shoppers/i)).toBeInTheDocument());
    expect(supabaseDouble.tables.product_qa[0]).toMatchObject({ published: false });
    expect(supabaseDouble.tables.product_qa[0].answer).toBe('Yes, two years worldwide.');
  });

  it('filters the queue by the text a seller types', async () => {
    supabaseDouble.seedQuestion(questionRow({ id: QUESTION, product_id: PRODUCT, vendor_id: 'store-1' }));
    supabaseDouble.seedQuestion(
      questionRow({
        id: 'q-2',
        product_id: PRODUCT,
        vendor_id: 'store-1',
        question: 'Which colour is the carry case?',
      }),
    );
    renderWorkspace(<VendorQAPage />);

    await waitFor(() => expect(screen.getByText(/Does this work with a USB-C hub\?/)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search by question, product or user/i), {
      target: { value: 'carry case' },
    });

    expect(screen.getByText(/Which colour is the carry case\?/)).toBeInTheDocument();
    expect(screen.queryByText(/Does this work with a USB-C hub\?/)).not.toBeInTheDocument();
  });

  it('shows the failed read as an error, not as an empty inbox', async () => {
    supabaseDouble.failures.product_qa = 'connection terminated';
    renderWorkspace(<VendorQAPage />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to load your questions: connection terminated/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/No buyer has asked a question/i)).not.toBeInTheDocument();
  });
});
