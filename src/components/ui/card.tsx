import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Card primitive — the shared panel surface used across the admin console.
 * Mirrors the panel treatment the admin pages hand-roll today (white surface,
 * slate border, rounded-xl corners, subtle `shadow-2xs`) so pages can adopt it
 * without a visual change. Sub-components follow the Dialog header/footer
 * composition pattern: Header / Title / Description / Content / Footer.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-slate-200/90 bg-white shadow-2xs',
      'dark:border-white/10 dark:bg-[#121214]',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      'text-base font-bold tracking-tight text-slate-900 dark:text-slate-100',
      className,
    )}
    {...props}
  />
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn('text-xs text-slate-500 dark:text-slate-400', className)}
    {...props}
  />
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
);
CardFooter.displayName = 'CardFooter';
