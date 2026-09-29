/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { SortOption } from '../../utils/listQuery';

interface ListControlsProps {
  query: string;
  onQueryChange: (q: string) => void;
  searchPlaceholder?: string;
  sortId: string;
  onSortChange: (id: string) => void;
  sortOptions: SortOption<any>[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  itemLabel?: string;
}

/**
 * H-02: one shared search, sort, and pagination bar for every admin and
 * portal list. Compact by design so it fits queue headers on phone widths.
 */
export const ListControls: React.FC<ListControlsProps> = ({
  query,
  onQueryChange,
  searchPlaceholder = 'Search this list...',
  sortId,
  onSortChange,
  sortOptions,
  page,
  totalPages,
  onPageChange,
  total,
  itemLabel = 'items',
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full pl-8 pr-2 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-primary)]"
          />
        </label>
        {sortOptions.length > 0 && (
          <select
            value={sortId}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort list"
            className="px-2 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand-primary)]"
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
        <span>
          {total} {itemLabel}
        </span>
        {totalPages > 1 && (
          <span className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-1 rounded border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-surface)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="p-1 rounded border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-surface)]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
};
