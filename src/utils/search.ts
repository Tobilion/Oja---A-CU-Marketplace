/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Fuse from 'fuse.js';
import { Listing } from '../types';

export interface FilterOptions {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sellerHallId?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  inStockOnly?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
}

const SYNONYMS: Record<string, string[]> = {
  charger: ['adapter', 'cable', 'cord', 'power brick', 'fast charger'],
  adapter: ['charger', 'cable', 'converter', 'dongle'],
  cable: ['charger', 'cord', 'wire', 'type c', 'lightning'],
  thrift: ['okrika', 'vintage', 'second hand', 'preloved', 'used'],
  okrika: ['thrift', 'vintage', 'preloved', 'clothes'],
  book: ['textbook', 'course pack', 'past question', 'pq', 'manual'],
  pq: ['past question', 'exam paper', 'course pack', 'test'],
  laptop: ['notebook', 'macbook', 'pc', 'computer'],
  phone: ['smartphone', 'iphone', 'android', 'device'],
  indomie: ['noodles', 'pasta', 'spaghetti'],
  hair: ['braids', 'wig', 'extensions', 'attachment'],
};

/**
 * Expands a query with synonyms to catch alternate student terminology.
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().trim().split(/\s+/);
  const expansions = new Set<string>();
  expansions.add(query);

  for (const word of words) {
    if (SYNONYMS[word]) {
      for (const syn of SYNONYMS[word]) {
        expansions.add(syn);
      }
    }
  }

  return Array.from(expansions);
}

/**
 * Searches and filters listings with Fuse.js typo tolerance.
 */
export function filterAndSearchListings(
  listings: Listing[],
  options: FilterOptions,
  sellerMap: Record<string, { hallId: string; ratingAverage: number; isVerified: boolean }>
): Listing[] {
  let results = [...listings];

  // 1. Text Search (Fuse.js)
  if (options.query && options.query.trim().length > 0) {
    const trimmed = options.query.trim();
    const queryVariants = expandQueryWithSynonyms(trimmed);

    const fuse = new Fuse(results, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
        { name: 'dynamicValues.brand', weight: 0.4 },
        { name: 'dynamicValues.courseCode', weight: 0.5 },
      ],
      threshold: 0.4, // typo tolerance
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    const matchedSet = new Set<string>();
    const matchedListings: Listing[] = [];

    for (const variant of queryVariants) {
      const searchRes = fuse.search(variant);
      for (const item of searchRes) {
        if (!matchedSet.has(item.item.id)) {
          matchedSet.add(item.item.id);
          matchedListings.push(item.item);
        }
      }
    }

    results = matchedListings;
  }

  // 2. Category Filter
  if (options.categoryId) {
    results = results.filter((l) => l.categoryId === options.categoryId);
  }

  // 3. Price Filter
  if (options.minPrice !== undefined && options.minPrice > 0) {
    results = results.filter((l) => l.price >= options.minPrice!);
  }
  if (options.maxPrice !== undefined && options.maxPrice > 0) {
    results = results.filter((l) => l.price <= options.maxPrice!);
  }

  // 4. Condition Filter
  if (options.condition) {
    results = results.filter((l) => l.condition === options.condition);
  }

  // 5. In Stock Only Filter
  if (options.inStockOnly) {
    results = results.filter((l) => l.stock > 0);
  }

  // 6. Seller Filters (Hall, Rating, Verified)
  if (options.sellerHallId || options.minRating || options.verifiedOnly) {
    results = results.filter((l) => {
      const seller = sellerMap[l.sellerId];
      if (!seller) return false;

      if (options.sellerHallId && seller.hallId !== options.sellerHallId) {
        return false;
      }
      if (options.minRating && seller.ratingAverage < options.minRating) {
        return false;
      }
      if (options.verifiedOnly && !seller.isVerified) {
        return false;
      }
      return true;
    });
  }

  // 7. Sorting
  if (options.sortBy) {
    switch (options.sortBy) {
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => {
          const ratingA = sellerMap[a.sellerId]?.ratingAverage || 0;
          const ratingB = sellerMap[b.sellerId]?.ratingAverage || 0;
          return ratingB - ratingA;
        });
        break;
    }
  }

  return results;
}

const RECENT_SEARCHES_KEY = 'oja_recent_searches';

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : ['laptop charger', 'calculator', 'indomie', 'past questions'];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  if (!query || query.trim().length < 2) return;
  try {
    const existing = getRecentSearches();
    const updated = [query.trim(), ...existing.filter((s) => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage issues
  }
}
