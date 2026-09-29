/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { getRecentSearches, saveRecentSearch } from '../../utils/search';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearchSubmit: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearchSubmit,
}) => {
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (value.trim()) {
        saveRecentSearch(value.trim());
        setRecentSearches(getRecentSearches());
        onSearchSubmit(value.trim());
        setShowRecent(false);
      }
    }
  };

  const handleSelectRecent = (term: string) => {
    onChange(term);
    saveRecentSearch(term);
    onSearchSubmit(term);
    setShowRecent(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowRecent(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search laptops, chargers, textbooks, braids, snacks..."
          className="w-full pl-10 pr-9 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all shadow-xs"
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              onSearchSubmit('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-0.5"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showRecent && recentSearches.length > 0 && !value && (
        <div className="absolute left-0 right-0 mt-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 z-30 animate-in fade-in duration-100">
          <div className="px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Recent Campus Searches
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recentSearches.map((term, i) => (
              <button
                key={i}
                onClick={() => handleSelectRecent(term)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--color-surface-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text-main)] transition-colors"
              >
                <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
