import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/auth-context', async () => {
  const { useAuthStub } = await import('../test/auth-context-stub');
  return { useAuth: useAuthStub };
});
vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return {
    supabase: supabaseDouble,
    isSupabaseConfigured: true,
    TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
  };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AdminHomepageSectionsPage } from './AdminHomepageSectionsPage';
import { renderWorkspace } from '../test/vendor-render';
import { useAuthStore } from '../store/auth-store';
import { DEMO_ACCOUNTS } from '../lib/demo-accounts';
import {
  siteSectionItemRow,
  siteSectionRow,
  supabaseDouble,
} from '../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  const admin = supabaseDouble.seedAdmin();
  useAuthStore.getState().setUser(
    { ...DEMO_ACCOUNTS.admin, id: admin.id, email: admin.email, name: admin.name },
    'test-token',
  );
});

const renderPage = () =>
  renderWorkspace(<AdminHomepageSectionsPage />, ['/admin/homepage-sections']);

describe('AdminHomepageSectionsPage (Batch 85)', () => {
  it('lists the sections the database holds, with their type labels', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    supabaseDouble.seedSiteSection(
      siteSectionRow({
        id: 's-2',
        key: 'app-promo',
        type: 'promo-banner',
        title: 'Vendora in Your Mobile Browser',
        sort_order: 30,
      }),
    );
    supabaseDouble.seedSiteSectionItem(siteSectionItemRow({ id: 'i-1', section_id: 's-1' }));

    renderPage();

    expect(await screen.findByText('Explore Popular Categories')).toBeTruthy();
    expect(await screen.findByText('Vendora in Your Mobile Browser')).toBeTruthy();
    expect(screen.getByText('Category tiles')).toBeTruthy();
    expect(screen.getByText('Promo banner')).toBeTruthy();
    expect(screen.getByText(/· 1 item/)).toBeTruthy();
  });

  it('creates a section from the type picker and shows it in the list', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Weekend Picks' } });
    expect((screen.getByLabelText(/Key \(auto from title\)/) as HTMLInputElement).placeholder).toBe(
      'weekend-picks',
    );
    fireEvent.click(screen.getByRole('button', { name: /create section/i }));

    expect(await screen.findByText('Weekend Picks')).toBeTruthy();
    const rows = supabaseDouble.tables.site_sections.filter((row) => row.key === 'weekend-picks');
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('category-tiles');
  });

  it('disabling a section writes is_enabled=false to its row', async () => {
    supabaseDouble.seedSiteSection(siteSectionRow({ id: 's-1' }));
    renderPage();

    const toggle = await screen.findByLabelText('Enabled');
    expect((toggle as HTMLInputElement).checked).toBe(true);
    fireEvent.click(toggle);

    await waitFor(() => {
      const row = supabaseDouble.tables.site_sections.find((entry) => entry.id === 's-1');
      expect(row?.is_enabled).toBe(false);
    });
  });

  it('shows the empty state when the console holds no sections', async () => {
    renderPage();
    expect(await screen.findByText(/No homepage sections yet/)).toBeTruthy();
  });
});
