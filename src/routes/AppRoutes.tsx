/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { MarketplaceHome } from '../components/marketplace/MarketplaceHome';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ListingPage } from '../pages/ListingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { StorePage } from '../pages/StorePage';
import { LoginPage } from '../pages/LoginPage';
import { RequireAccess } from './guards';
import { RouteFallback } from '../components/common/RouteFallback';
import { Category, Hall, Listing, UserProfile } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { paths, routePatterns } from './paths';
import { ErrorBoundary, LazyErrorBoundary } from '../components/common/ErrorBoundary';

// Secondary flows load on demand so the marketplace entry chunk stays small.
// Each page is a named export, mapped to the default shape lazy() expects.
const OrdersPage = lazy(() => import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import('../pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage }))
);
const CheckoutPage = lazy(() => import('../pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const MessagesPage = lazy(() => import('../pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const SellPage = lazy(() => import('../pages/SellPage').then((m) => ({ default: m.SellPage })));
const SellerApplyPage = lazy(() =>
  import('../pages/SellerApplyPage').then((m) => ({ default: m.SellerApplyPage }))
);
const RegisterBusinessPage = lazy(() =>
  import('../pages/RegisterBusinessPage').then((m) => ({ default: m.RegisterBusinessPage }))
);
const RecycleBinPage = lazy(() =>
  import('../pages/RecycleBinPage').then((m) => ({ default: m.RecycleBinPage }))
);
const SellerPortalPage = lazy(() =>
  import('../pages/SellerPortalPage').then((m) => ({ default: m.SellerPortalPage }))
);
const AgentPortalPage = lazy(() =>
  import('../pages/AgentPortalPage').then((m) => ({ default: m.AgentPortalPage }))
);
const AdminPage = lazy(() => import('../pages/AdminPage').then((m) => ({ default: m.AdminPage })));

export interface AppRoutesProps {
  listings: Listing[];
  categories: Category[];
  halls: Hall[];
  allUsers: UserProfile[];
  onOpenSellerApply: () => void;
}

/**
 * The route table. Public browsing routes sit at the top; account-gated
 * routes wrap their page in RequireAccess (login redirect or 403).
 */
export const AppRoutes: React.FC<AppRoutesProps> = ({
  listings,
  categories,
  halls,
  allUsers,
  onOpenSellerApply,
}) => {
  useDocumentTitle();
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
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
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <OrdersPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.order}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <OrderDetailPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.checkout}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <CheckoutPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.messages}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <MessagesPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.messageThread}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <MessagesPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.sell}
          element={
            <RequireAccess requirement="seller">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <SellPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.registerBusiness}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <RegisterBusinessPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.sellerApply}
          element={
            <RequireAccess requirement="signed-in">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <SellerApplyPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.seller}
          element={
            <RequireAccess requirement="seller">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <SellerPortalPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.recycleBin}
          element={
            <RequireAccess requirement="seller">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <RecycleBinPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.agent}
          element={
            <RequireAccess requirement="agent">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <AgentPortalPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.admin}
          element={
            <RequireAccess requirement="admin">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <AdminPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route
          path={routePatterns.adminTab}
          element={
            <RequireAccess requirement="admin">
              <LazyErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <AdminPage />
                </Suspense>
              </LazyErrorBoundary>
            </RequireAccess>
          }
        />
        <Route path={routePatterns.login} element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
};
