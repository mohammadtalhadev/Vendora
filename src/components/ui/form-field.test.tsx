import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field';
import { Input } from './input';

describe('FormField primitive', () => {
  it('associates the label with the control', () => {
    render(
      <FormField label="Store name" htmlFor="store-name">
        <Input id="store-name" />
      </FormField>,
    );
    expect(screen.getByLabelText('Store name')).toBeInTheDocument();
  });

  it('wires hint and error ids into the control aria-describedby', () => {
    render(
      <FormField
        label="Store name"
        htmlFor="store-name"
        hint="Shown to buyers."
        error="Name is required."
      >
        <Input id="store-name" hasError aria-invalid />
      </FormField>,
    );
    const input = screen.getByLabelText('Store name');
    expect(input.getAttribute('aria-describedby')).toBe('store-name-hint store-name-error');
    expect(screen.getByText('Shown to buyers.')).toHaveAttribute('id', 'store-name-hint');
    const error = screen.getByText('Name is required.');
    expect(error).toHaveAttribute('id', 'store-name-error');
    expect(error.className).toContain('text-coral');
  });

  it('renders the hint in slate and marks required fields', () => {
    render(
      <FormField label="Email" htmlFor="email" hint="We never share it." required>
        <Input id="email" />
      </FormField>,
    );
    expect(screen.getByText('We never share it.').className).toContain('text-slate-500');
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute(
      'aria-describedby',
      'email-hint',
    );
  });

  it('renders a bare control when no label, hint or error is given', () => {
    render(
      <FormField>
        <Input placeholder="Unlabelled" />
      </FormField>,
    );
    expect(screen.getByPlaceholderText('Unlabelled')).toBeInTheDocument();
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });
});
