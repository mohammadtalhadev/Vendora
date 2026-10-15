import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Batch 64: the step-up gate at the level the pages use it — a fresh proof
 * runs the parked action immediately, a stale (or missing) proof opens the
 * dialog and the action does not exist until the code verifies.
 */
const mfaApi = vi.hoisted(() => ({
  factors: [] as Array<{ id: string; status: 'verified' | 'unverified'; createdAt: string }>,
  verifyTotp: vi.fn(),
  listTotpFactors: vi.fn(),
}));

vi.mock('../api/mfa', async () => {
  const actual = await vi.importActual<typeof import('../api/mfa')>('../api/mfa');
  return {
    ...actual,
    listTotpFactors: mfaApi.listTotpFactors,
    verifyTotp: mfaApi.verifyTotp,
  };
});

import { markStepUpVerified, needsStepUp } from '../api/mfa';
import { useStepUp } from './StepUpDialog';

function Harness({ onAction }: { onAction: () => void }) {
  const { requireStepUp, stepUpDialog } = useStepUp();
  const [, setTick] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => requireStepUp(onAction)}>
        Do the sensitive thing
      </button>
      <button type="button" onClick={() => setTick((t) => t + 1)}>
        rerender
      </button>
      {stepUpDialog}
    </div>
  );
}

function typeCode(code: string) {
  fireEvent.change(screen.getByLabelText('Code digit 1'), { target: { value: code } });
}

describe('useStepUp (Batch 64)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mfaApi.verifyTotp.mockReset();
    mfaApi.listTotpFactors.mockReset();
    mfaApi.listTotpFactors.mockResolvedValue({
      verified: [{ id: 'factor-1', status: 'verified', createdAt: '' }],
      unverified: [],
    });
  });

  it('runs the action immediately while the proof is fresh — no dialog', async () => {
    markStepUpVerified();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Do the sensitive thing' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Code digit 1')).not.toBeInTheDocument();
  });

  it('parks the action behind the dialog when the proof is stale, and runs it only after verify', async () => {
    markStepUpVerified(Date.now() - 11 * 60 * 1000);
    mfaApi.verifyTotp.mockResolvedValue(undefined);
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Do the sensitive thing' }));

    expect(await screen.findByLabelText('Code digit 1')).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
    expect(needsStepUp()).toBe(false);
  });

  it('a wrong code fires nothing and the dialog stays open for another try', async () => {
    mfaApi.verifyTotp.mockRejectedValueOnce(new Error('That code was not accepted.'));
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Do the sensitive thing' }));
    expect(await screen.findByLabelText('Code digit 1')).toBeInTheDocument();

    typeCode('000000');
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(await screen.findByText(/not accepted/i)).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Code digit 1')).toBeInTheDocument();
  });
});
