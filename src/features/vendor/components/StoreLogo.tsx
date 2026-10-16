import React, { useState } from 'react';
import { cn } from '../../../lib/utils';

interface StoreLogoProps {
  /** Store display name — its first letter becomes the fallback monogram. */
  name: string;
  logo?: string | null;
  /** Size/shape classes for the tile (e.g. "h-12 w-12 rounded-2xl"). */
  className?: string;
}

/**
 * A store's logo with a graceful fallback. Brand logos now come
 * from an external logo CDN, so a missing URL or a failed load must never
 * surface as a broken image: the tile falls back to the store's initial on
 * the peach treatment. Used by the store directory cards and the storefront
 * header — the two places a store logo renders.
 */
export const StoreLogo: React.FC<StoreLogoProps> = ({ name, logo, className }) => {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim().charAt(0) || 'V').toUpperCase();

  if (!logo || failed) {
    return (
      <div
        aria-label={`${name} logo`}
        role="img"
        className={cn(
          'flex items-center justify-center bg-orange-50 font-outfit text-xl font-black text-sun-orange-700 select-none',
          className,
        )}
      >
        <span className="leading-none">{initial}</span>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden bg-white', className)}>
      <img
        src={logo}
        alt={`${name} logo`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
};
