import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';

describe('CountdownTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the one format: DD : HH : MM : SS under the shared label', () => {
    vi.useFakeTimers();
    render(<CountdownTimer initialDays={39} initialHours={5} initialMinutes={4} initialSeconds={57} />);
    expect(screen.getByText('Remaining Time:')).toBeInTheDocument();
    expect(screen.getByText('39')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('57')).toBeInTheDocument();
  });

  it('ticks down one second at a time and borrows from minutes', () => {
    vi.useFakeTimers();
    const { container } = render(
      <CountdownTimer initialDays={0} initialHours={0} initialMinutes={1} initialSeconds={0} />,
    );
    const text = () => (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text()).toContain('00:00:01:00');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(text()).toContain('00:00:00:59');
  });
});
