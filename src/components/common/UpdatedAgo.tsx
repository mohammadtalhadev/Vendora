import React from 'react';
import { useNow } from '../../hooks/useNow';
import { formatUpdatedAgo } from '../../lib/updated-ago';

/**
 * The quiet freshness label that replaces the dashboards' big manual refresh
 * buttons: the boards re-read themselves on a poll, and this says how long ago
 * the numbers on screen actually landed. Renders nothing before the first
 * successful read, so it never claims a freshness it does not have.
 */
export const UpdatedAgo: React.FC<{ updatedAt: number; className?: string }> = ({
  updatedAt,
  className,
}) => {
  const now = useNow(5_000);
  if (!updatedAt) return null;
  return <span className={className}>Updated {formatUpdatedAgo(updatedAt, now)}</span>;
};
