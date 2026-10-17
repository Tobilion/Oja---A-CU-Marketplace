/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { MarketplaceHome } from '../components/marketplace/MarketplaceHome';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ListingPage } from '../pages/ListingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { StorePage } from '../pages/StorePage';
import { Category, Hall, Listing, UserProfile } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { paths, routePatterns } from './paths';

export interface AppRoutesProps {
  listings: Listing[];
  categories: Category[];
  halls: Hall[];
  allUsers: UserProfile[];
  onOpenCreateListing: () => void;
  onOpenSellerApply: () => void;
  // Temporary: opens the global chat drawer until the messaging route ships.
  onOpenChatWith: (targetUserId: string) => void;
}

/**
 * The route table. Public browsing routes are wired here; transactional and
 * portal routes are added in later phases while the remaining modals stay
 * mounted in App.tsx until they are converted.
 */
export const AppRoutes: React.FC<AppRoutesProps> = ({
  listings,
  categories,
  halls,
  allUsers,
  onOpenCreateListing,
  onOpenSellerApply,
  onOpenChatWith,
}) => {
  useDocumentTitle();
  const navigate = useNavigate();

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
            onSelectListing={(listing) => navigate(paths.listing(listing.id))}
            onOpenCreateListing={onOpenCreateListing}
            onOpenSellerApply={onOpenSellerApply}
          />
        }
      />
      <Route path={routePatterns.listing} element={<ListingPage onOpenChatWith={onOpenChatWith} />} />
      <Route path={routePatterns.store} element={<StorePage />} />
      <Route
        path={routePatterns.profile}
        element={<ProfilePage onOpenChatWith={onOpenChatWith} onOpenSellerApply={onOpenSellerApply} />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
