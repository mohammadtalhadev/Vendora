import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', async () => {
  const { supabaseDouble } = await import('../../../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { MfaSettingsCard } from './MfaSettingsCard';
import { supabaseDouble } from '../../../test/supabase-double';

/**
 * Batch 64: the settings card against the double's MFA surface (its one
 * accepted code is '123456'). Setup activates a factor from the card, and
 * removal demands a fresh code before the factor is unenrolled.
 */
describe('MfaSettingsCard (Batch 64)', () => {
  beforeEach(() => {
    supabaseDouble.reset();
    supabaseDouble.seedAdmin();
    window.sessionStorage.clear();
  });

  it('shows not-set-up, and setup enrols + activates a factor from the card', async () => {
    render(<MfaSettingsCard />);

    expect(await screen.findByText(/Not set up/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up an authenticator' }));

    expect(await screen.findByAltText('Authenticator setup QR code')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Code digit 1'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and switch on' }));

    expect(await screen.findByText(/Two-factor authentication is on/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remove authenticator/i })).toBeInTheDocument(),
    );
  });

  it('removal asks for a fresh code first, then unenrolls the factor', async () => {
    supabaseDouble.seedMfaFactor('verified');
    render(<MfaSettingsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /Remove authenticator/i }));

    // aal1 session + no fresh proof: the step-up dialog must come first.
    expect(await screen.findByText('Confirm before removing 2FA')).toBeInTheDocument();
    expect(supabaseDouble.authState.mfaFactors).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Code digit 1'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    await waitFor(() => expect(supabaseDouble.authState.mfaFactors).toHaveLength(0));
    expect(await screen.findByText(/Two-factor authentication is off/i)).toBeInTheDocument();
  });
});
