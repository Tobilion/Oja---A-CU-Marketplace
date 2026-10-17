/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { MarketplaceHome } from '../components/marketplace/MarketplaceHome';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Business, Category, Hall, Listing, UserProfile } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { routePatterns } from './paths';

export interface AppRoutesProps {
  listings: Listing[];
  categories: Category[];
  halls: Hall[];
  businesses: Business[];
  allUsers: UserProfile[];
  onSelectListing: (listing: Listing) => void;
  onOpenCreateListing: () => void;
  onOpenSellerApply: () => void;
}

/**
 * The route table. Phase 1 wires the home page and the catch-all; public,
 * transactional, and portal routes are added in later phases while the
 * remaining modals stay mounted in App.tsx until they are converted.
 */
export const AppRoutes: React.FC<AppRoutesProps> = ({
  listings,
  categories,
  halls,
  businesses,
  allUsers,
  onSelectListing,
  onOpenCreateListing,
  onOpenSellerApply,
}) => {
  useDocumentTitle();

  return (
    <Routes>
      <Route
        path={routePatterns.home}
        element={
          <MarketplaceHome
            listings={listings}
            categories={categories}
            halls={halls}
            allUsers={allUsers}
            onSelectListing={onSelectListing}
            onOpenCreateListing={onOpenCreateListing}
            onOpenSellerApply={onOpenSellerApply}
          />
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
