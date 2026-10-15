import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveChatModal } from './LiveChatModal';
import { useAuthStore } from '../../../store/auth-store';
import type { User } from '../../../types/domain';

/**
 * Batch 127 (owner report + live guest repro): clicking "Live chat" on the
 * product page opened the seller chat pinned to the BOTTOM of the page,
 * clipped, as a full 520px shell whose only content for a guest was one
 * sign-in line above a sea of empty space, with the quick prompts, the
 * textbox and the send button all disabled. Two pins:
 *   - the overlay renders through a portal to document.body, so no page
 *     ancestor can capture its fixed positioning again (the Batch 114
 *     BackToTopButton lesson);
 *   - when no chat can happen (guest / first-party listing) the panel is
 *     the compact notice with a real sign-in call to action — the composer
 *     is not rendered at all.
 * The signed-in vendor chat keeps its full composer once the thread loads.
 */

vi.mock('../api/chat', () => ({
  findOrCreateProductThread: vi.fn(async () => ({ id: 'thread-1' })),
  fetchChatMessages: vi.fn(async () => []),
  sendChatMessage: vi.fn(async () => ({
    id: 'msg-1',
    senderRole: 'customer' as const,
    senderName: 'Test Buyer',
    body: 'Hello',
    createdAt: new Date().toISOString(),
  })),
}));

const customer: User = {
  id: 'user-1',
  email: 'buyer@example.pk',
  name: 'Test Buyer',
  roles: ['customer'],
  vendorStatus: 'none',
};

const renderModal = (props: Partial<React.ComponentProps<typeof LiveChatModal>> = {}) => {
  const utils = render(
    <MemoryRouter>
      <LiveChatModal
        isOpen
        onClose={() => {}}
        sellerName="Nike Flagship Store"
        sellerId="vendor-1"
        productId="product-1"
        {...props}
      />
    </MemoryRouter>,
  );
  return utils;
};

describe('LiveChatModal (Batch 127)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('portals the dialog to document.body, outside the mount subtree', () => {
    const { container } = renderModal();
    const dialog = screen.getByRole('dialog', { name: /chat with nike flagship store/i });
    expect(document.body.contains(dialog)).toBe(true);
    expect(container.contains(dialog)).toBe(false);
  });

  it('guest gets a compact sign-in panel — no disabled composer at all', () => {
    renderModal();
    expect(screen.getByText(/please sign in to message this seller/i)).toBeInTheDocument();
    const signIn = screen.getByRole('link', { name: /sign in to message seller/i });
    expect(signIn).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/register',
    );
    // No textbox, no quick-prompt chips, nothing disabled to poke at.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /is this in stock/i }),
    ).not.toBeInTheDocument();
    // And not the full-height chat shell.
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).not.toContain('h-[520px]');
  });

  it('a first-party listing explains support handles it, with no composer', () => {
    useAuthStore.setState({ user: customer, token: 't', isAuthenticated: true });
    renderModal({ sellerId: 'platform' });
    expect(screen.getByText(/handled by vendora support/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('signed-in buyer gets the full chat: composer appears once the thread loads', async () => {
    useAuthStore.setState({ user: customer, token: 't', isAuthenticated: true });
    renderModal();
    const input = await screen.findByPlaceholderText(/type your question/i);
    expect(input).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /is this in stock for immediate dispatch/i }),
    ).not.toBeDisabled();
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('h-[520px]');
  });
});
