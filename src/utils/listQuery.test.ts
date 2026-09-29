/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyListQuery, SortOption } from './listQuery';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

interface Row {
  name: string;
  age: number;
}

const byName: SortOption<Row> = { id: 'name', label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) };
const byAgeDesc: SortOption<Row> = { id: 'age', label: 'Age', compare: (a, b) => b.age - a.age };

const ROWS: Row[] = [
  { name: 'Chidi', age: 22 },
  { name: 'Amina', age: 25 },
  { name: 'Bola', age: 20 },
  { name: 'Aminu', age: 30 },
];

export function runListQueryTests(): { passed: number; total: number; logs: string[] } {
  const logs: string[] = [];
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      logs.push(`PASS: ${name}`);
    } catch (e: any) {
      logs.push(`FAIL: ${name} -> ${e.message}`);
    }
  }

  const text = (r: Row) => `${r.name} ${r.age}`;

  test('empty query returns first page in original order', () => {
    const res = applyListQuery(ROWS, { query: '', searchText: text, page: 1, pageSize: 2 });
    assert(res.total === 4, `Expected total 4, got ${res.total}`);
    assert(res.pageItems.length === 2 && res.pageItems[0].name === 'Chidi', 'Expected original order page 1');
    assert(res.totalPages === 2, `Expected 2 pages, got ${res.totalPages}`);
  });

  test('search filters case-insensitively across the composed text', () => {
    const res = applyListQuery(ROWS, { query: 'AMIN', searchText: text, page: 1, pageSize: 10 });
    assert(res.total === 2, `Expected 2 matches, got ${res.total}`);
  });

  test('sort option orders the filtered set', () => {
    const res = applyListQuery(ROWS, { query: '', searchText: text, sort: byAgeDesc, page: 1, pageSize: 10 });
    assert(res.pageItems[0].name === 'Aminu' && res.pageItems[3].name === 'Bola', 'Expected age-desc order');
  });

  test('page clamps to the last page instead of returning empty', () => {
    const res = applyListQuery(ROWS, { query: '', searchText: text, page: 99, pageSize: 3 });
    assert(res.page === 2 && res.pageItems.length === 1, `Expected clamped page 2, got ${res.page}`);
  });

  test('no matches returns empty page with a single empty page count', () => {
    const res = applyListQuery(ROWS, { query: 'zzz', searchText: text, page: 1, pageSize: 10 });
    assert(res.total === 0 && res.pageItems.length === 0 && res.totalPages === 1, 'Expected empty result set');
  });

  return { passed, total, logs };
}

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('listQuery.test')) {
  const result = runListQueryTests();
  console.log(`\nList Query Test Results: ${result.passed}/${result.total} passed`);
  result.logs.forEach((l) => console.log('  ' + l));
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
