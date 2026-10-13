import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

/**
 * Multiline counterpart of the Input primitive, with the same border, focus
 * ring and error treatment. Unlike Input it is NOT a capsule: `rounded-full`
 * geometry does not suit multiline text, so the Vendora panel radius
 * (`rounded-2xl`) applies here instead.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, disabled, ...props }, ref) => (
    <textarea
      ref={ref}
      disabled={disabled}
      className={cn(
        'flex min-h-[96px] w-full rounded-2xl border bg-white/95 px-5 py-3 text-sm text-ink',
        'placeholder:text-slate-400 transition-all duration-150 resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        hasError
          ? 'border-coral focus-visible:border-coral focus-visible:ring-coral/30'
          : 'border-slate-200 focus-visible:border-sun-orange focus-visible:ring-sun-orange/30',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
