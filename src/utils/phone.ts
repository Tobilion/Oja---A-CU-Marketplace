/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Nigerian mobile numbers for order coordination: 11 digits starting with 0
 * (e.g. 08031234567). Spaces and dashes are ignored; the +234 international
 * prefix is rejected so stored numbers stay in one callable local format.
 */
export function isValidNigerianPhone(input: string): boolean {
  const digits = (input || '').replace(/[\s-]/g, '');
  return /^0\d{10}$/.test(digits);
}

/** Normalizes accepted input to plain digits (removes spaces and dashes). */
export function normalizeNigerianPhone(input: string): string {
  return (input || '').replace(/[\s-]/g, '');
}
