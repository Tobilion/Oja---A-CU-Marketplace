/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SlidersHorizontal, X, Check } from 'lucide-react';
import { Category, Hall } from '../../types';
import { FilterOptions } from '../../utils/search';

interface FilterBarProps {
  categories: Category[];
  halls: Hall[];
  filters: FilterOptions;
  onChange: (updated: FilterOptions) => void;
  onReset: () => void;
  totalResultsCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  halls,
  filters,
  onChange,
  onReset,
  totalResultsCount,
}) => {
  const activeChips: { key: keyof FilterOptions; label: string }[] = [];

  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId);
    activeChips.push({ key: 'categoryId', label: `Category: ${cat?.name || filters.categoryId}` });
  }
  if (filters.sellerHallId) {
    const hall = halls.find((h) => h.id === filters.sellerHallId);
    activeChips.push({ key: 'sellerHallId', label: `Hall: ${hall?.name || filters.sellerHallId}` });
  }
  if (filters.condition) {
    activeChips.push({ key: 'condition', label: `Condition: ${filters.condition}` });
  }
  if (filters.inStockOnly) {
    activeChips.push({ key: 'inStockOnly', label: 'In Stock Only' });
  }
  if (filters.verifiedOnly) {
    activeChips.push({ key: 'verifiedOnly', label: 'Verified Sellers' });
  }
  if (filters.minPrice) {
    activeChips.push({ key: 'minPrice', label: `Min ₦${filters.minPrice.toLocaleString()}` });
  }
  if (filters.maxPrice) {
    activeChips.push({ key: 'maxPrice', label: `Max ₦${filters.maxPrice.toLocaleString()}` });
  }

  const removeChip = (key: keyof FilterOptions) => {
    const copy = { ...filters };
    delete copy[key];
    onChange(copy);
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Category Segmented Scroll Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => onChange({ ...filters, categoryId: undefined })}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
            !filters.categoryId
              ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
          }`}
        >
          All Items
        </button>
        {categories.map((c) => {
          const isSelected = filters.categoryId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onChange({ ...filters, categoryId: isSelected ? undefined : c.id })}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                isSelected
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Secondary Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[var(--color-surface)] p-2.5 rounded-xl border border-[var(--color-border)] shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Hall Selector */}
          <select
            value={filters.sellerHallId || ''}
            onChange={(e) => onChange({ ...filters, sellerHallId: e.target.value || undefined })}
            className="bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Halls</option>
            {halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.gender})
              </option>
            ))}
          </select>

          {/* Condition Selector */}
          <select
            value={filters.condition || ''}
            onChange={(e) => onChange({ ...filters, condition: e.target.value || undefined })}
            className="bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Any Condition</option>
            <option value="New">Brand New</option>
            <option value="Like new">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>

          {/* In Stock Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] select-none">
            <input
              type="checkbox"
              checked={!!filters.inStockOnly}
              onChange={(e) => onChange({ ...filters, inStockOnly: e.target.checked || undefined })}
              className="accent-[var(--color-brand-primary)] rounded w-3.5 h-3.5"
            />
            <span>In Stock</span>
          </label>

          {/* Verified Seller Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] select-none">
            <input
              type="checkbox"
              checked={!!filters.verifiedOnly}
              onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked || undefined })}
              className="accent-[var(--color-brand-primary)] rounded w-3.5 h-3.5"
            />
            <span>Verified Sellers</span>
          </label>
        </div>

        {/* Sort & Result Count */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[var(--color-text-muted)] font-mono tabular-nums">
            {totalResultsCount} {totalResultsCount === 1 ? 'item' : 'items'}
          </span>

          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
            className="bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated Seller</option>
          </select>
        </div>
      </div>

      {/* Removable Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[var(--color-text-muted)] text-[11px] font-medium mr-1">Active filters:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-main)]"
            >
              <span>{chip.label}</span>
              <button
                onClick={() => removeChip(chip.key)}
                className="hover:text-red-500 transition-colors ml-0.5"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={onReset}
            className="text-[var(--color-brand-primary)] hover:underline ml-2 text-[11px] font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
