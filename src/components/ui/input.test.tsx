import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input primitive', () => {
  it('enforces rounded-full capsule geometry', () => {
    render(<Input placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input.className).toContain('rounded-full');
  });

  it('renders left and right icons correctly', () => {
    render(
      <Input
        placeholder="With icons"
        leftIcon={<span data-testid="left-icon">🔍</span>}
        rightIcon={<span data-testid="right-icon">✖</span>}
      />,
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('With icons');
    expect(input.className).toContain('pl-11');
    expect(input.className).toContain('pr-11');
  });

  it('applies error styling when hasError is set', () => {
    render(<Input placeholder="Error input" hasError />);
    const input = screen.getByPlaceholderText('Error input');
    expect(input.className).toContain('border-coral');
  });
});
