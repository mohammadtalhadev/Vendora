import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryPill } from './CategoryPill';

describe('CategoryPill', () => {
  it('renders one recipe: selected is solid orange with a white label', () => {
    render(<CategoryPill selected>Smartphones & Tech</CategoryPill>);
    const pill = screen.getByRole('button', { name: 'Smartphones & Tech' });
    expect(pill.className).toContain('bg-sun-orange');
    expect(pill.className).toContain('text-white');
    expect(pill.getAttribute('aria-pressed')).toBe('true');
  });

  it('unselected is the white resting state, never the old pale-peach tint', () => {
    render(<CategoryPill>Computers & Laptops</CategoryPill>);
    const pill = screen.getByRole('button', { name: 'Computers & Laptops' });
    expect(pill.className).toContain('bg-white');
    expect(pill.className).not.toContain('bg-orange-500/10');
    expect(pill.getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onClick and supports the small size', () => {
    const onClick = vi.fn();
    render(
      <CategoryPill size="sm" onClick={onClick}>
        All Audio
      </CategoryPill>,
    );
    const pill = screen.getByRole('button', { name: 'All Audio' });
    expect(pill.className).toContain('text-[11px]');
    fireEvent.click(pill);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
