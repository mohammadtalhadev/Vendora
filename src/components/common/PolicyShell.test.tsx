import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PolicyShell, PolicySection } from './PolicyShell';

describe('PolicyShell', () => {
  it('renders exactly one h1, the eyebrow and the intro', () => {
    render(
      <PolicyShell eyebrow="Legal" title="Cookie Policy" intro={<p>What we store.</p>}>
        <PolicySection index={1} title="Essential cookies">
          <p>Session storage only.</p>
        </PolicySection>
      </PolicyShell>,
    );
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Cookie Policy');
    expect(screen.getByText('Legal')).toBeInTheDocument();
    expect(screen.getByText('What we store.')).toBeInTheDocument();
  });

  it('numbers sections with the orange index prefix', () => {
    render(
      <PolicyShell eyebrow="Legal" title="Terms">
        <PolicySection index={3} title="Delivery">
          <p>Nationwide.</p>
        </PolicySection>
      </PolicyShell>,
    );
    const heading = screen.getByRole('heading', { level: 2, name: /delivery/i });
    expect(heading).toHaveTextContent('03');
    expect(heading).toHaveTextContent('Delivery');
  });

  it('renders the hero action when given', () => {
    render(
      <PolicyShell
        eyebrow="Legal"
        title="Terms"
        action={<button type="button">Print</button>}
      >
        <p>Body</p>
      </PolicyShell>,
    );
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });
});
