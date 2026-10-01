/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { ListingCard } from './ListingCard';
import { TrustStrip } from '../layout/TrustStrip';
import { AvatarRow, OrbitAvatars } from '../landing/OrbitAvatars';
import { ChatSimulation } from '../landing/ChatSimulation';
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

  // Hero phone tilt target for the orbit parallax loop.
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const [heroHover, setHeroHover] = useState(false);

  // Headline scramble-in, borrowed from the console TextScramble and the
  // portfolio useTextScramble: glyphs resolve into the exact existing copy.
  // Copy and font are unchanged; only the entrance is animated.
  const HEADLINE = "Campus trade, kept honest.";
  const [headline, setHeadline] = useState(HEADLINE);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHeadline(HEADLINE);
      return;
    }
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let frame = 0;
    let timer = 0;
    const total = HEADLINE.length * 2;
    const tick = () => {
      frame += 1;
      const resolved = Math.floor((frame / total) * HEADLINE.length);
      let out = "";
      for (let i = 0; i < HEADLINE.length; i++) {
        const ch = HEADLINE[i];
        if (ch === " " || i < resolved) out += ch;
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setHeadline(out);
      if (frame < total) timer = window.setTimeout(tick, 35);
      else setHeadline(HEADLINE);
    };
    timer = window.setTimeout(tick, 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero: existing headline/subhead/search on the left, live phone + orbit on the right.
          Copy and headline font are unchanged. No buttons or trust items here;
          the trust strip below keeps that job. */}
      <section className="relative overflow-hidden">
        {/* Pastel blobs. Transform and opacity only. Theme tinted. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl dark:bg-indigo-950/60 animate-[hero-drift_26s_ease-in-out_infinite]" />
          <div className="absolute right-[30%] top-40 h-64 w-64 rounded-full bg-amber-100/70 blur-3xl dark:bg-orange-950/40 animate-[hero-drift_32s_ease-in-out_infinite_reverse]" />
          <style>{`@keyframes hero-drift { 0%,100% { transform: translate3d(0,0,0); opacity: 0.8; } 50% { transform: translate3d(24px,-18px,0); opacity: 1; } }`}</style>
        </div>

        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 pt-10 pb-8 md:py-6 md:h-[640px] lg:h-[660px] flex flex-col justify-center">
          <div className="grid items-center gap-8 md:gap-4 md:grid-cols-[55%_45%]">
            {/* LEFT: existing copy, left aligned */}
            <div className="relative z-10 space-y-4 text-left">
              <h1
                aria-label={HEADLINE}
                className="font-extrabold font-display tracking-tight text-[var(--color-text-main)] text-left text-[1.9rem] leading-[1.08] sm:text-4xl md:text-[2.1rem] lg:text-[2.75rem]"
              >
                <span aria-hidden="true">{headline}</span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed text-left max-w-md mx-0">
                The student-to-student marketplace for Covenant University. Verified matric identities, escrow-protected payments, and room deliveries by vetted hall runners.
              </p>

              {/* Search keeps all current behavior. Left column is under
                  max-w-2xl so the bar fills the column width. */}
              <div className="pt-2 w-full [&>div]:mx-0 [&>div]:max-w-none">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearchSubmit={(val) => setSearchQuery(val)}
                />
              </div>
            </div>

            {/* MOBILE: overlapping avatar row between search and phone */}
            <div className="md:hidden relative z-10">
              <AvatarRow />
            </div>

            {/* RIGHT: phone with live chat, avatars orbiting around it.
                Orbit is absolutely positioned inside this column and sized
                to stay clear of the left column and the nav. */}
            <div className="relative z-0 flex justify-center md:justify-end md:pr-10">
              <div
                className="relative"
                onMouseEnter={() => setHeroHover(true)}
                onMouseLeave={() => setHeroHover(false)}
              >
                <div className="relative z-20">
                  <ChatSimulation phoneRef={phoneRef} />
                </div>
                <OrbitAvatars phoneRef={phoneRef} paused={heroHover} />
              </div>
            </div>
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
            <span className="font-display font-extrabold text-sm text-[var(--color-text-main)] mr-2">Oja</span>
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
