import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge primitive', () => {
  it('renders the order lifecycle label and tone for delivered', () => {
    render(<StatusBadge status="delivered" />);
    const badge = screen.getByText('Delivered');
    expect(badge.className).toContain('bg-emerald-50');
    expect(badge.className).toContain('text-emerald-700');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('text-[10px]');
    expect(badge.className).toContain('font-bold');
  });

  it('maps snake_case tokens to their shared labels', () => {
    render(<StatusBadge status="out_for_delivery" />);
    const badge = screen.getByText('Out for delivery');
    expect(badge.className).toContain('bg-purple-50');
  });

  it('keeps the AdminUsersPage treatments for account statuses', () => {
    const { rerender } = render(<StatusBadge status="active" />);
    expect(screen.getByText('Active').className).toContain('bg-slate-900');
    rerender(<StatusBadge status="banned" />);
    expect(screen.getByText('Banned').className).toContain('bg-rose-600');
    rerender(<StatusBadge status="suspended" />);
    expect(screen.getByText('Suspended').className).toContain('bg-rose-50');
  });

  it('uses the moderation amber for pending_review', () => {
    render(<StatusBadge status="pending_review" />);
    const badge = screen.getByText('Pending Review');
    expect(badge.className).toContain('bg-amber-50');
    expect(badge.className).toContain('text-amber-700');
  });

  it('falls back to neutral slate and a de-underscored label for unknown statuses', () => {
    render(<StatusBadge status="awaiting_courier" />);
    const badge = screen.getByText('awaiting courier');
    expect(badge.className).toContain('bg-slate-100');
    expect(badge.className).toContain('text-slate-700');
  });

  it('lets an explicit label win over the map (legacy raw-token displays)', () => {
    render(<StatusBadge status="approved" label="approved" />);
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
  });
});
