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
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { MessagesPage } from '../pages/MessagesPage';
import { LoginPage } from '../pages/LoginPage';
import { RequireAccess } from './guards';
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
}

/**
 * The route table. Public browsing routes sit at the top; account-gated
 * routes wrap their page in RequireAccess (login redirect or 403). Portal
 * routes are added in later phases while the remaining modals stay mounted
 * in App.tsx until they are converted.
 */
export const AppRoutes: React.FC<AppRoutesProps> = ({
  listings,
  categories,
  halls,
  allUsers,
  onOpenCreateListing,
  onOpenSellerApply,
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
      <Route path={routePatterns.listing} element={<ListingPage />} />
      <Route path={routePatterns.store} element={<StorePage />} />
      <Route
        path={routePatterns.profile}
        element={<ProfilePage onOpenSellerApply={onOpenSellerApply} />}
      />
      <Route
        path={routePatterns.orders}
        element={
          <RequireAccess requirement="signed-in">
            <OrdersPage />
          </RequireAccess>
        }
      />
      <Route
        path={routePatterns.order}
        element={
          <RequireAccess requirement="signed-in">
            <OrderDetailPage />
          </RequireAccess>
        }
      />
      <Route
        path={routePatterns.checkout}
        element={
          <RequireAccess requirement="signed-in">
            <CheckoutPage />
          </RequireAccess>
        }
      />
      <Route
        path={routePatterns.messages}
        element={
          <RequireAccess requirement="signed-in">
            <MessagesPage />
          </RequireAccess>
        }
      />
      <Route
        path={routePatterns.messageThread}
        element={
          <RequireAccess requirement="signed-in">
            <MessagesPage />
          </RequireAccess>
        }
      />
      <Route path={routePatterns.login} element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
