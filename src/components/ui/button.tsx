import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  | 'default'
  | 'orange-cta'
  | 'glass-pill'
  | 'outline'
  | 'ghost'
  | 'secondary'
  | 'destructive';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-ink text-white hover:bg-ink/90 active:scale-[0.98] shadow-sm',
  'orange-cta':
    'bg-sun-orange text-white hover:bg-[#EA6C13] shadow-md hover:shadow-orange-glow active:scale-[0.98] font-semibold',
  'glass-pill':
    'bg-white/75 hover:bg-white/95 text-ink border border-white/60 backdrop-blur-[16px] shadow-glass-pill hover:shadow-glass active:scale-[0.98] supports-[not(backdrop-filter:blur(0))]:bg-white',
  outline:
    'border border-slate-200 bg-white/70 hover:bg-white text-ink active:scale-[0.98] shadow-xs',
  ghost:
    'hover:bg-slate-100/80 hover:text-ink text-slate-700 active:scale-[0.98]',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-ink active:scale-[0.98]',
  destructive:
    'bg-coral text-white hover:bg-coral/90 active:scale-[0.98] shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-10 px-5 py-2 text-sm',
  sm: 'h-8 px-3.5 text-xs',
  lg: 'h-12 px-7 text-base font-medium',
  icon: 'h-10 w-10 p-0',
};

/**
 * Returns class names for button variants following Vendora pill design system.
 * Invariant: All buttons enforce `rounded-full`.
 */
export function buttonVariants({
  variant = 'default',
  size = 'default',
  className = '',
}: ButtonVariantOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-orange/50 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
    variantStyles[variant] || variantStyles.default,
    sizeStyles[size] || sizeStyles.default,
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
