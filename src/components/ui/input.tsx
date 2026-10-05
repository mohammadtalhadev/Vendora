import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hasError?: boolean;
}

/**
 * Capsule Input primitive adhering strictly to the `rounded-full` design invariant.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', leftIcon, rightIcon, hasError, disabled, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          'flex h-11 w-full rounded-full border bg-white/95 px-5 py-2 text-sm text-ink',
          'placeholder:text-slate-400 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError
            ? 'border-coral focus-visible:border-coral focus-visible:ring-coral/30'
            : 'border-slate-200 focus-visible:border-sun-orange focus-visible:ring-sun-orange/30',
          leftIcon && 'pl-11',
          rightIcon && 'pr-11',
          className,
        )}
        {...props}
      />
    );

    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex w-full items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}
          {inputElement}
          {rightIcon && (
            <div className="absolute right-4 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  },
);

Input.displayName = 'Input';
