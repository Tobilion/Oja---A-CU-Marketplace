/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall } from '../types';
import { INITIAL_HALLS } from './halls';

/**
 * Cleanly formats a hallId (e.g. "hall_peter") into the authentic proper name.
 * Full style returns e.g. "Peter Hall"; short style (dense chips and cards)
 * returns e.g. "Peter". Unknown ids fall back to title case, never "PETER".
 */
export function formatHallName(hallId?: string, halls?: Hall[], style: 'full' | 'short' = 'full'): string {
  if (!hallId) return style === 'short' ? 'CU' : 'Covenant University';
  const list = halls && halls.length > 0 ? halls : INITIAL_HALLS;
  const match = list.find((h) => h.id.toLowerCase() === hallId.toLowerCase());
  if (match) {
    if (style === 'short') return match.name.replace(/\s+Hall$/i, '');
    return match.name;
  }

  // Fallback: Title case without "hall_" prefix
  const clean = hallId.replace(/^hall_/i, '');
  const titled = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return style === 'short' ? titled : titled + ' Hall';
}
