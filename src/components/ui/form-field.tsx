import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/utils';

export interface FormFieldProps {
  /** Visible label text rendered through the Radix Label primitive. */
  label?: React.ReactNode;
  /**
   * Id of the control the label points at. Also the base for the hint/error
   * element ids: `${htmlFor}-hint` and `${htmlFor}-error`.
   */
  htmlFor?: string;
  /** Error message; rendered in coral below the control and wired for aria. */
  error?: string;
  /** Helper text; rendered in slate below the control and wired for aria. */
  hint?: string;
  /** Shows a coral asterisk after the label. */
  required?: boolean;
  /** The control (Input, Textarea, SelectTrigger, ...). */
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField — label + control + hint/error composition for form rows.
 *
 * FormField renders the Radix Label and the hint/error paragraphs, and wires
 * `aria-describedby` onto the child control for you (merged with any
 * `aria-describedby` the child already carries). The ids are deterministic —
 * `${htmlFor}-hint` / `${htmlFor}-error` — so the page can also reference them
 * itself; pair them with `aria-invalid` (and the control's `hasError` prop)
 * on the child when `error` is set:
 *
 * ```tsx
 * <FormField label="Store name" htmlFor="store-name" error={errors.name} hint="Shown to buyers.">
 *   <Input id="store-name" hasError={!!errors.name} aria-invalid={!!errors.name} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control =
    describedBy && React.isValidElement<{ 'aria-describedby'?: string }>(children)
      ? React.cloneElement(children, {
          'aria-describedby':
            [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') ||
            undefined,
        })
      : children;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label != null && (
        <LabelPrimitive.Root
          htmlFor={htmlFor}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
          {required && (
            <span className="text-coral" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </LabelPrimitive.Root>
      )}
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

FormField.displayName = 'FormField';
