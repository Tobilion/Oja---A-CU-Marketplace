/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall } from '../types';
import { INITIAL_HALLS } from './halls';

/**
 * Cleanly formats a hallId (e.g. "hall_peter") into the authentic proper name (e.g. "Peter Hall").
 * Eliminates mechanical "PETER Hall" formatting bugs.
 */
export function formatHallName(hallId?: string, halls?: Hall[]): string {
  if (!hallId) return 'Covenant University';
  const list = halls && halls.length > 0 ? halls : INITIAL_HALLS;
  const match = list.find((h) => h.id.toLowerCase() === hallId.toLowerCase());
  if (match) return match.name;

  // Fallback: Title case without "hall_" prefix
  const clean = hallId.replace(/^hall_/i, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() + ' Hall';
}
