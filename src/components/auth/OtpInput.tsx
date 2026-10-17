/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Boxes rendered for the common case; grows to maxLength when the code needs it. */
  baseLength?: number;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

const digitsOnly = (input: string, max: number) =>
  input.replace(/[^0-9]/g, '').slice(0, max);

/**
 * Segmented one-time-code input: one box per digit with paste distribution
 * and arrow-key navigation. Supabase email codes run 6-8 digits, so the box
 * count grows from baseLength to maxLength once the code needs it.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  baseLength = 6,
  maxLength = 8,
  disabled = false,
  autoFocus = false,
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const count = value.length > baseLength ? maxLength : baseLength;

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const apply = (index: number, input: string) => {
    const clean = digitsOnly(input, maxLength);
    if (!clean) return;
    const next = (value.slice(0, index) + clean + value.slice(index + clean.length)).slice(0, maxLength);
    onChange(next);
    const boxCount = Math.max(count, next.length);
    refs.current[Math.min(index + clean.length, boxCount - 1)]?.focus();
  };

  const handleChange = (index: number, text: string) => {
    if (text === '') {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    apply(index, text);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const target = value[index] ? index : Math.max(0, index - 1);
      onChange(value.slice(0, target) + value.slice(target + 1));
      refs.current[Math.max(0, target - 1)]?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      refs.current[Math.max(0, index - 1)]?.focus();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      refs.current[Math.min(count - 1, index + 1)]?.focus();
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    apply(index, event.clipboardData.getData('text'));
  };

  return (
    <div className="flex justify-center gap-1.5 sm:gap-2" role="group" aria-label="Verification code">
      {Array.from({ length: count }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ''}
          onFocus={(event) => event.target.select()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          aria-label={`Digit ${index + 1} of ${count}`}
          className={`h-12 w-9 sm:w-10 rounded-xl border bg-[var(--color-surface-subtle)] text-center font-mono text-lg font-bold text-[var(--color-text-main)] outline-none transition-colors disabled:opacity-50 ${
            value[index]
              ? 'border-[var(--color-brand-primary)]'
              : 'border-[var(--color-border)]'
          } focus:border-[var(--color-brand-primary)]`}
        />
      ))}
    </div>
  );
};
