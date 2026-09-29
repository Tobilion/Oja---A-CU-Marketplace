/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * H-02: one shared list engine for every admin and portal list (search,
 * filter, sort, pagination). Pure and unit-tested; the useListQuery hook and
 * ListControls component wrap it for UI use.
 */

export interface SortOption<T> {
  id: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface ListQueryArgs<T> {
  query: string;
  searchText: (item: T) => string;
  sort?: SortOption<T> | null;
  page: number;
  pageSize: number;
}

export interface ListQueryResult<T> {
  pageItems: T[];
  total: number;
  totalPages: number;
  page: number;
}

export function applyListQuery<T>(items: T[], args: ListQueryArgs<T>): ListQueryResult<T> {
  const q = args.query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => args.searchText(item).toLowerCase().includes(q))
    : [...items];
  if (args.sort) {
    filtered.sort(args.sort.compare);
  }
  const total = filtered.length;
  const pageSize = Math.max(1, args.pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, args.page), totalPages);
  const start = (page - 1) * pageSize;
  return {
    pageItems: filtered.slice(start, start + pageSize),
    total,
    totalPages,
    page,
  };
}
