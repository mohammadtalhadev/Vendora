import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <ConfirmDialog open={false} onOpenChange={() => {}} title="Delete?" onConfirm={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the action and its consequence, and confirms only on the confirm button', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Clear your cart?"
        description="This removes all 3 items. This cannot be undone."
        confirmLabel="Clear Cart"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Clear your cart?')).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Cart' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel closes without confirming', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} title="Delete?" onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons and shows the pending label while the action runs', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Send?"
        confirmLabel="Send announcement"
        isPending
        pendingLabel="Sending…"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
