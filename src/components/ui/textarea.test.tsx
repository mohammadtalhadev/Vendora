import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from './textarea';

describe('Textarea primitive', () => {
  it('uses panel radius instead of the capsule geometry', () => {
    render(<Textarea placeholder="Seller notes" />);
    const textarea = screen.getByPlaceholderText('Seller notes');
    expect(textarea.className).toContain('rounded-2xl');
    expect(textarea.className).not.toContain('rounded-full');
  });

  it('mirrors the Input focus and border treatment', () => {
    render(<Textarea placeholder="Guidance" />);
    const textarea = screen.getByPlaceholderText('Guidance');
    expect(textarea.className).toContain('border-slate-200');
    expect(textarea.className).toContain('focus-visible:ring-sun-orange/30');
  });

  it('applies error styling when hasError is set', () => {
    render(<Textarea placeholder="Error notes" hasError />);
    const textarea = screen.getByPlaceholderText('Error notes');
    expect(textarea.className).toContain('border-coral');
  });
});
