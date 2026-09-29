/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { applyListQuery, SortOption } from '../utils/listQuery';

/**
 * H-02: stateful wrapper around applyListQuery for admin and portal lists.
 * Resets to page 1 whenever the query or sort changes.
 */
export function useListQuery<T>(args: {
  items: T[];
  searchText: (item: T) => string;
  sortOptions: SortOption<T>[];
  defaultSortId?: string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState('');
  const [sortId, setSortId] = useState(args.sortOptions[0]?.id || '');
  const [page, setPage] = useState(1);
  const size = args.pageSize || 10;

  const sort = useMemo(
    () => args.sortOptions.find((o) => o.id === sortId) || args.sortOptions[0] || null,
    [args.sortOptions, sortId]
  );

  const result = useMemo(
    () => applyListQuery(args.items, { query, searchText: args.searchText, sort, page, pageSize: size }),
    [args.items, query, args.searchText, sort, page, size]
  );

  const updateQuery = (q: string) => {
    setQuery(q);
    setPage(1);
  };
  const updateSort = (id: string) => {
    setSortId(id);
    setPage(1);
  };

  return { query, setQuery: updateQuery, sortId, setSortId: updateSort, sortOptions: args.sortOptions, ...result, setPage };
}
