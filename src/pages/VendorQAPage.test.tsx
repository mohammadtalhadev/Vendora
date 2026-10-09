import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorQAPage } from './VendorQAPage';

describe('VendorQAPage component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Q&A inbox with tabs for Unanswered, Answered, and All questions', () => {
    render(
      <MemoryRouter>
        <VendorQAPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Customer Product Q&A Inbox/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unanswered 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Answered 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All 15/i })).toBeInTheDocument();
  });

  it('displays unanswered question cards with product thumbnails and customer usernames', () => {
    render(
      <MemoryRouter>
        <VendorQAPage />
      </MemoryRouter>
    );

    expect(screen.getByText('@mech_enthusiast88')).toBeInTheDocument();
    expect(
      screen.getByText(/Does this keyboard support magnetic rapid-trigger actuation adjustment/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Compose Answer/i })[0]).toBeInTheDocument();
  });

  it('allows composing an answer and publishing to product detail page', async () => {
    render(
      <MemoryRouter>
        <VendorQAPage />
      </MemoryRouter>
    );

    const composeButtons = screen.getAllByRole('button', { name: /Compose Answer/i });
    fireEvent.click(composeButtons[0]);

    const textarea = screen.getByPlaceholderText(/Provide a clear, helpful response explaining/i);
    fireEvent.change(textarea, {
      target: {
        value: 'Yes, our proprietary Hall Effect magnetic switches support 0.1mm increments.',
      },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Answer/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Answer submitted and published to Product Detail Page!/i)
      ).toBeInTheDocument();
    });

    // Count of unanswered should decrease
    expect(screen.getByRole('button', { name: /Unanswered 2/i })).toBeInTheDocument();
  });

  it('switches to Answered tab and allows editing an answer', async () => {
    render(
      <MemoryRouter>
        <VendorQAPage />
      </MemoryRouter>
    );

    const answeredTab = screen.getByRole('button', { name: /Answered 12/i });
    fireEvent.click(answeredTab);

    expect(screen.getByText('@minimal_desk')).toBeInTheDocument();
    const editBtns = screen.getAllByRole('button', { name: /Edit Answer/i });
    fireEvent.click(editBtns[0]);

    const editTextarea = screen.getByDisplayValue(/Yes, absolutely! The surface features a hydrophobic/i);
    fireEvent.change(editTextarea, {
      target: { value: 'Updated response: nano-coated and completely spill-proof.' },
    });

    const updateBtn = screen.getByRole('button', { name: /Update Answer/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Answer updated successfully/i)).toBeInTheDocument();
      expect(
        screen.getByText('Updated response: nano-coated and completely spill-proof.')
      ).toBeInTheDocument();
    });
  });

  it('filters questions via search input', () => {
    render(
      <MemoryRouter>
        <VendorQAPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search by question, product or user\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'rapid-trigger' } });

    expect(screen.getByText('@mech_enthusiast88')).toBeInTheDocument();
    expect(screen.queryByText('@nomad_coder')).not.toBeInTheDocument();
  });
});
