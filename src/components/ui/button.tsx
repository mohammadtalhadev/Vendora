import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  | 'default'
  | 'orange-cta'
  | 'gradient'
  | 'glass-pill'
  | 'outline'
  | 'ghost'
  | 'secondary'
  | 'destructive'
  | 'ink';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-sun-orange text-white hover:bg-sun-orange-600 shadow-md hover:shadow-orange-glow active:scale-[0.98] font-semibold',
  'orange-cta':
    'bg-sun-orange text-white hover:bg-sun-orange-600 shadow-md hover:shadow-orange-glow active:scale-[0.98] font-semibold',
  // The admin/vendor primary CTA that was copy-pasted as a raw class string
  // (~10 sites): orange gradient, white text, warm shadow, gradient deepens
  // on hover. Canonised here with token colours — the pasted string ended
  // at #EA580C (Tailwind orange-600); the token end-stop sun-orange-600
  // (#EA6C13) is one shade step warmer/lighter.
  gradient:
    'bg-gradient-to-r from-sun-orange to-sun-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:from-sun-orange-600 hover:to-sun-orange-700 hover:shadow-orange-500/35 active:scale-[0.98]',
  ink:
    'bg-ink dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-ink/90 dark:hover:bg-white active:scale-[0.98] shadow-sm',
  'glass-pill':
    'bg-white/75 dark:bg-slate-800/80 hover:bg-white/95 dark:hover:bg-slate-800 text-ink dark:text-slate-100 border border-white/60 dark:border-slate-700 backdrop-blur-[16px] shadow-glass-pill hover:shadow-glass active:scale-[0.98] supports-[not(backdrop-filter:blur(0))]:bg-white',
  outline:
    'border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-ink dark:text-slate-200 active:scale-[0.98] shadow-xs',
  ghost:
    'hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-100 text-slate-700 dark:text-slate-300 active:scale-[0.98]',
  secondary:
    'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink dark:text-slate-100 active:scale-[0.98]',
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
