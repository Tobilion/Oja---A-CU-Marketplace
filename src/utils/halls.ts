/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall } from '../types';

export const INITIAL_HALLS: Hall[] = [
  // Male Halls
  { id: 'hall_peter', name: 'Peter Hall', gender: 'male', active: true },
  { id: 'hall_joseph', name: 'Joseph Hall', gender: 'male', active: true },
  { id: 'hall_paul', name: 'Paul Hall', gender: 'male', active: true },
  { id: 'hall_daniel', name: 'Daniel Hall', gender: 'male', active: true },
  { id: 'hall_john', name: 'John Hall', gender: 'male', active: true },
  { id: 'hall_samuel', name: 'Samuel Hall', gender: 'male', active: true },

  // Female Halls
  { id: 'hall_mary', name: 'Mary Hall', gender: 'female', active: true },
  { id: 'hall_esther', name: 'Esther Hall', gender: 'female', active: true },
  { id: 'hall_dorcas', name: 'Dorcas Hall', gender: 'female', active: true },
  { id: 'hall_deborah', name: 'Deborah Hall', gender: 'female', active: true },
];

export function getHallById(halls: Hall[], id: string): Hall | undefined {
  return halls.find((h) => h.id === id);
}

export function getHallsByGender(halls: Hall[], gender: 'male' | 'female'): Hall[] {
  return halls.filter((h) => h.active && (h.gender === gender || h.gender === 'mixed'));
}
