/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Currency utilities for Oja.
 * All internal money calculations MUST use integer naira.
 */

export function formatNaira(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return '₦' + rounded.toLocaleString('en-NG');
}

export function formatNairaCompact(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  if (num >= 1_000_000) {
    return `₦${(num / 1_000_000).toFixed(1)}m`;
  }
  if (num >= 1_000) {
    return `₦${(num / 1_000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
  }
  return `₦${num}`;
}

export function toIntegerNaira(val: number | string): number {
  const parsed = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : val;
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}
