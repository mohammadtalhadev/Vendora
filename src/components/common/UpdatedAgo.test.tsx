import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdatedAgo } from './UpdatedAgo';
import { formatUpdatedAgo } from '../../lib/updated-ago';

describe('formatUpdatedAgo', () => {
  const now = 1_000_000_000_000;

  it('calls a fresh read "just now"', () => {
    expect(formatUpdatedAgo(now - 3_000, now)).toBe('just now');
  });

  it('counts seconds, then minutes, then hours', () => {
    expect(formatUpdatedAgo(now - 42_000, now)).toBe('42s ago');
    expect(formatUpdatedAgo(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatUpdatedAgo(now - 2 * 3_600_000, now)).toBe('2h ago');
  });

  it('never reports a negative age for a future timestamp', () => {
    expect(formatUpdatedAgo(now + 30_000, now)).toBe('just now');
  });
});

describe('UpdatedAgo', () => {
  it('renders nothing before the first read lands', () => {
    const { container } = render(<UpdatedAgo updatedAt={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the age of the numbers on screen', () => {
    render(<UpdatedAgo updatedAt={Date.now() - 42_000} />);
    expect(screen.getByText('Updated 42s ago')).toBeInTheDocument();
  });
});
