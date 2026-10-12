import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fetchPlatformSettings, savePlatformSettings } from './settings';
import { platformSettingsRow, supabaseDouble } from '../../../test/supabase-double';

beforeEach(() => {
  supabaseDouble.reset();
  supabaseDouble.seedAdmin();
});

describe('fetchPlatformSettings', () => {
  it('reads the single row the migration inserts, by column name', async () => {
    supabaseDouble.seedPlatformSettings(platformSettingsRow({
      platform_name: 'Vendora Marketplace', default_currency: 'EUR', min_payout_floor: 75, sla_ceiling_hours: 24,
    }));

    const settings = await fetchPlatformSettings();

    expect(settings).toEqual({
      platformName: 'Vendora Marketplace',
      supportEmail: 'ops@vendora.market',
      defaultCurrency: 'EUR',
      payoutSchedule: 'Bi-weekly on Monday',
      minPayoutFloor: 75,
      reserveRetentionDays: 14,
      newListingReview: 'Moderate (Standard)',
      slaCeilingHours: 24,
    });
  });

  it('throws when the settings row is missing rather than rendering defaults', async () => {
    supabaseDouble.tables.platform_settings.length = 0;

    await expect(fetchPlatformSettings()).rejects.toThrow(/single settings row is missing/i);
  });

  it('throws when the read fails', async () => {
    supabaseDouble.failures.platform_settings = 'permission denied for table platform_settings';

    await expect(fetchPlatformSettings()).rejects.toThrow(/failed to load platform settings/i);
  });
});

describe('savePlatformSettings', () => {
  it('sends the patch through the RPC and returns the row as the database now holds it', async () => {
    const saved = await savePlatformSettings({ supportEmail: 'help@vendora.market', minPayoutFloor: 120 });

    expect(supabaseDouble.rpcCalls.at(-1)?.fn).toBe('admin_save_platform_settings');
    expect(saved.supportEmail).toBe('help@vendora.market');
    expect(saved.minPayoutFloor).toBe(120);
    expect(supabaseDouble.tables.platform_settings[0]).toMatchObject({
      support_email: 'help@vendora.market', min_payout_floor: 120,
    });
  });

  it('leaves the columns a patch says nothing about alone', async () => {
    await savePlatformSettings({ currency: 'GBP' });

    expect(supabaseDouble.tables.platform_settings[0]).toMatchObject({
      default_currency: 'GBP',
      platform_name: 'Vendora Multi-Vendor Marketplace',
      payout_schedule: 'Bi-weekly on Monday',
    });
  });

  it('drops undefined keys instead of writing them, so a blank field cannot erase a setting', async () => {
    await savePlatformSettings({ platformName: 'Renamed', supportEmail: undefined });

    expect(supabaseDouble.rpcCalls.at(-1)?.args.p_settings).toEqual({ platformName: 'Renamed' });
  });

  it('records who changed it and what the row said before', async () => {
    await savePlatformSettings({ slaCeilingHours: 12 });

    const entry = supabaseDouble.tables.audit_logs.at(-1);
    expect(entry).toMatchObject({
      action: 'settings.update',
      entity_type: 'platform_settings',
      actor_id: 'admin-1',
    });
    expect((entry?.before_data as Record<string, unknown>).sla_ceiling_hours).toBe(48);
    expect((entry?.after_data as Record<string, unknown>).sla_ceiling_hours).toBe(12);
  });

  it('refuses a writer that is not the platform team, and leaves the row alone', async () => {
    supabaseDouble.authState.session = { access_token: 't', user: { id: 'seller-1', email: 's@demo.test' } };

    await expect(savePlatformSettings({ currency: 'JPY' })).rejects.toThrow(/only the platform team can change platform settings/i);
    expect(supabaseDouble.tables.platform_settings[0].default_currency).toBe('USD');
  });

  it('throws when the write fails rather than assuming it landed', async () => {
    supabaseDouble.failRpc('new row for platform_settings violates a check');

    await expect(savePlatformSettings({ minPayoutFloor: -5 })).rejects.toThrow(/could not save the platform settings/i);
  });
});
