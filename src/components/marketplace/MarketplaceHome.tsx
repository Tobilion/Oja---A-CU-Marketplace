/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { ListingCard } from './ListingCard';
import { TrustStrip } from '../layout/TrustStrip';
import { Listing, Category, Hall, UserProfile } from '../../types';
import { FilterOptions, filterAndSearchListings } from '../../utils/search';
import { Package, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MarketplaceHomeProps {
  listings: Listing[];
  categories: Category[];
  halls: Hall[];
  allUsers: UserProfile[];
  onSelectListing: (listing: Listing) => void;
  onOpenCreateListing: () => void;
  onOpenSellerApply: () => void;
}

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  listings,
  categories,
  halls,
  allUsers,
  onSelectListing,
  onOpenCreateListing,
  onOpenSellerApply,
}) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'newest',
  });

  // Map users for fast seller lookup
  const sellerMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const u of allUsers) {
      map[u.id] = u;
    }
    return map;
  }, [allUsers]);

  const sellerStatsMap = useMemo(() => {
    const map: Record<string, { hallId: string; ratingAverage: number; isVerified: boolean }> = {};
    for (const u of allUsers) {
      map[u.id] = {
        hallId: u.hallId,
        ratingAverage: u.ratingAverage,
        isVerified: u.badges.includes('Verified Seller'),
      };
    }
    return map;
  }, [allUsers]);

  const activeFilters = useMemo(() => {
    return { ...filters, query: searchQuery };
  }, [filters, searchQuery]);

  const filteredListings = useMemo(() => {
    return filterAndSearchListings(listings, activeFilters, sellerStatsMap);
  }, [listings, activeFilters, sellerStatsMap]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({ sortBy: 'newest' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Editorial Hero Section (Restrained, Spacious) */}
      <section className="pt-10 pb-8 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-[var(--color-text-main)] text-balance">
            Campus trade, kept honest.
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed">
            The student-to-student marketplace for Covenant University. Verified matric identities, escrow-protected payments, and room deliveries by vetted hall runners.
          </p>

          {/* Search Input Bar */}
          <div className="pt-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearchSubmit={(val) => setSearchQuery(val)}
            />
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <TrustStrip />

      {/* Main Browse Section */}
      <main id="explore" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Compact Filter Bar */}
        <FilterBar
          categories={categories}
          halls={halls}
          filters={activeFilters}
          onChange={(upd) => setFilters(upd)}
          onReset={handleResetFilters}
          totalResultsCount={filteredListings.length}
        />

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8">
            <div className="p-4 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] w-16 h-16 mx-auto flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-main)]">No listings match your search</h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
              Try adjusting your query, price filters, or hall selection to discover other available campus items.
            </p>
            <div className="pt-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white text-xs font-semibold hover:opacity-90"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                seller={sellerMap[listing.sellerId]}
                onClick={() => onSelectListing(listing)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <div>
            <span className="font-display font-extrabold text-sm text-[var(--color-text-main)] mr-2">Ọjà</span>
            <span>Campus trade, kept honest · Covenant University, Ota</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Escrow Protected</span>
            <span>·</span>
            <span>Zero Counterfeit Policy</span>
            <span>·</span>
            <span>Hall Runner Logistics</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
