import * as React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'vendor-verified'
  | 'vendora-platform'
  | 'discount-coral'
  | 'in-stock'
  | 'default'
  | 'outline'
  | 'secondary';

export type BadgeSize = 'default' | 'sm' | 'lg';

export interface BadgeVariantOptions {
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  'vendor-verified':
    'bg-aqua/15 text-[#007E8A] border border-aqua/35 font-medium',
  'vendora-platform':
    'bg-sun-orange/15 text-[#D9610B] border border-sun-orange/35 font-semibold',
  'discount-coral':
    'bg-coral text-white border border-transparent font-bold shadow-xs',
  'in-stock':
    'bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-medium',
  default:
    'bg-ink text-white border-transparent',
  outline:
    'text-ink border border-slate-200 bg-transparent',
  secondary:
    'bg-slate-100 text-slate-700 border-transparent',
};

const sizeStyles: Record<BadgeSize, string> = {
  default: 'px-3 py-0.5 text-xs',
  sm: 'px-2.5 py-0.5 text-[11px]',
  lg: 'px-3.5 py-1 text-sm',
};

/**
 * Returns class names for badge variants following Vendora pill design system.
 * Invariant: All badges strictly enforce `rounded-full`.
 */
export function badgeVariants({
  variant = 'default',
  size = 'default',
  className = '',
}: BadgeVariantOptions = {}): string {
  return cn(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full transition-colors select-none',
    variantStyles[variant] || variantStyles.default,
    sizeStyles[size] || sizeStyles.default,
    className,
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={badgeVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
