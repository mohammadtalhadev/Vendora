import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

export interface OtpInputProps {
  /** The code so far (digits only, up to `length`). */
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Prefix for each box's aria-label ("Digit 1", "Digit 2", …). */
  label?: string;
}

/**
 * Segmented one-time-code input: one box per digit with auto-advance,
 * backspace-to-previous, arrow navigation and whole-code paste. Controlled —
 * the parent owns the string — so it drops into any verify form.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  label = 'Digit',
}) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    const box = inputs.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  };

  const setDigit = (index: number, digit: string) => {
    const chars = value.split('');
    while (chars.length < length) chars.push('');
    chars[index] = digit;
    onChange(chars.join('').replace(/\s+$/, ''));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      setDigit(index, '');
      return;
    }
    if (digits.length === 1) {
      setDigit(index, digits);
      if (index < length - 1) focusBox(index + 1);
      return;
    }
    // Typed or pasted several digits at once: spread them from this box.
    const chars = value.split('');
    while (chars.length < length) chars.push('');
    digits.split('').forEach((d, offset) => {
      if (index + offset < length) chars[index + offset] = d;
    });
    onChange(chars.join('').replace(/\s+$/, ''));
    focusBox(Math.min(length - 1, index + digits.length));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault();
      setDigit(index - 1, '');
      focusBox(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text').replace(/\D/g, '');
    if (text.length < 2) return; // single characters flow through onChange
    event.preventDefault();
    handleChange(0, text.slice(0, length));
  };

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Verification code">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${label} ${index + 1}`}
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-12 w-11 rounded-xl border border-slate-300 bg-white text-center font-outfit text-lg font-black text-slate-900 shadow-2xs transition-all',
            'focus:border-sun-orange focus:outline-none focus:ring-2 focus:ring-sun-orange/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-white/15 dark:bg-white/5 dark:text-white sm:w-12',
          )}
        />
      ))}
    </div>
  );
};

export default OtpInput;
