import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return {
    supabase: supabaseDouble,
    isSupabaseConfigured: true,
    TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
  };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeSectionAnchor } from './HomeSections';
import {
  siteSectionItemRow,
  siteSectionRow,
  supabaseDouble,
} from '../../../test/supabase-double';

function renderAnchor(anchor: 'categories' | 'mosaic' | 'promo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomeSectionAnchor anchor={anchor} fallback={<div>Built-in fallback block</div>} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  supabaseDouble.reset();
});

describe('HomeSectionAnchor (Batch 85)', () => {
  it('renders the built-in fallback while the sections read is unavailable', async () => {
    // The migration has not run on this host: the table read fails, and the
    // homepage must show its built-in composition instead of a gap.
    supabaseDouble.failures.site_sections = 'relation "site_sections" does not exist';
    renderAnchor('categories');
    expect(await screen.findByText('Built-in fallback block')).toBeTruthy();
  });

  it('renders the console sections once the read succeeds', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    supabaseDouble.seedSiteSectionItem(
      siteSectionItemRow({ id: 'i-1', section_id: 's-1', heading: 'Electronics' }),
    );
    renderAnchor('categories');
    expect(await screen.findByText('Explore Popular Categories')).toBeTruthy();
    expect(await screen.findByText('Electronics')).toBeTruthy();
    expect(screen.queryByText('Built-in fallback block')).toBeNull();
  });

  it('renders nothing (not the fallback) when a successful read has no sections for the anchor', async () => {
    // The read worked; the console simply holds nothing for this slot -
    // an admin disabled or deleted it, and that decision is honoured.
    renderAnchor('mosaic');
    await waitFor(() => {
      expect(screen.queryByText('Built-in fallback block')).toBeNull();
    });
  });
});
