import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async () => {
  const { supabaseDouble } = await import('../test/supabase-double');
  return { supabase: supabaseDouble, isSupabaseConfigured: true, TEST_SUPABASE_URL: 'http://127.0.0.1:54321' };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { ContactPage } from './ContactPage';
import { supabaseDouble } from '../test/supabase-double';

/**
 * the footer newsletter and the contact form write to the real
 * public inboxes — the old versions showed success and discarded the data
 * (newsletter) or only composed a mailto: link (contact).
 */
beforeEach(() => {
  supabaseDouble.reset();
});

describe('Footer newsletter', () => {
  it('stores the signup and confirms only after it lands', async () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Vendora Dispatch newsletter/i), {
      target: { value: 'reader@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Subscribe$/i }));

    expect(await screen.findByText('Subscribed!')).toBeInTheDocument();
    expect(supabaseDouble.tables.newsletter_subscribers).toHaveLength(1);
    expect(supabaseDouble.tables.newsletter_subscribers[0].email).toBe('reader@example.com');
  });

  it('tells a returning subscriber they are already on the list', async () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/Vendora Dispatch newsletter/i);
    fireEvent.change(input, { target: { value: 'reader@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Subscribe$/i }));
    expect(await screen.findByText('Subscribed!')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'reader@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Subscribed!/i }));
    expect(await screen.findByText(/already subscribed/i)).toBeInTheDocument();
    expect(supabaseDouble.tables.newsletter_subscribers).toHaveLength(1);
  });

  it('carries the one site-wide phone number and no fake social links', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText('+92 300 555 8363')).toBeInTheDocument();
    expect(screen.queryByText(/555-VENDORA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Follow Vendora/i)).not.toBeInTheDocument();
    expect(document.querySelector('a[href="https://facebook.com"]')).toBeNull();
  });
});

describe('ContactPage form', () => {
  it('stores the message in contact_messages and confirms the send', async () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Ayesha Khan' } });
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'ayesha@example.com' } });
    fireEvent.change(screen.getByLabelText(/How can we help/i), {
      target: { value: 'My parcel has not moved in three days.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText('Message sent')).toBeInTheDocument();
    expect(supabaseDouble.tables.contact_messages).toHaveLength(1);
    expect(supabaseDouble.tables.contact_messages[0]).toMatchObject({
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
      topic: 'buyer-care',
      message: 'My parcel has not moved in three days.',
    });
  });

  it('never opens a mail app: there is no "Open in my email app" flow left', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Open in my email app/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing is stored/i)).not.toBeInTheDocument();
  });
});
