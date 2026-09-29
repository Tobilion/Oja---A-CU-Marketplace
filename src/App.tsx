/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { MarketplaceHome } from './components/marketplace/MarketplaceHome';
import { ProductDetailModal } from './components/marketplace/ProductDetailModal';
import { BusinessStorefrontModal } from './components/business/BusinessStorefrontModal';
import { CreateBusinessModal } from './components/business/CreateBusinessModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { CreateListingModal } from './components/listings/CreateListingModal';
import { SellerApplyModal } from './components/seller/SellerApplyModal';
import { RecycleBinModal } from './components/seller/RecycleBinModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SellerPortalModal } from './components/seller/SellerPortalModal';
import { AgentPortalModal } from './components/delivery/AgentPortalModal';
import { AuthModal } from './components/auth/AuthModal';
import { ReviewModal } from './components/marketplace/ReviewModal';
import { Listing, Category, Hall, Business, Order, UserProfile } from './types';
import { repo, isSupabaseConfigMissing } from './data';
import { AlertOctagon, Terminal } from 'lucide-react';

function AppContent() {
  const { currentUser, allUsers, refreshUser } = useAuth();

  if (isSupabaseConfigMissing) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-neutral-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Database Configuration Required</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Oja is running in non-demo mode, but valid Supabase credentials (<code className="text-red-300">VITE_SUPABASE_URL</code> and <code className="text-red-300">VITE_SUPABASE_ANON_KEY</code>) were not detected. Silent fallback to mock data is strictly disabled.
            </p>
          </div>
          <div className="p-3 bg-black/50 border border-neutral-800 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>Required Resolution:</span>
            </div>
            <p className="text-amber-400">1. For local testing & review: set VITE_APP_MODE=demo in .env</p>
            <p className="text-sky-400">2. For live deployment: execute supabase/schema.sql and supply valid credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Modals & Drawers
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetUserId, setChatTargetUserId] = useState<string | undefined>(undefined);
  const [chatReferencedOrder, setChatReferencedOrder] = useState<Order | undefined>(undefined);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isSellerApplyOpen, setIsSellerApplyOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSellerPortalOpen, setIsSellerPortalOpen] = useState(false);
  const [isAgentPortalOpen, setIsAgentPortalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    listingId: string;
    subOrderId: string;
    orderId: string;
    agentId?: string;
  } | null>(null);

  const loadMarketplaceData = useCallback(async () => {
    try {
      const [l, c, h, b] = await Promise.all([
        repo.getListings(false),
        repo.getCategories(),
        repo.getHalls(),
        repo.getBusinesses(),
      ]);
      setListings(l);
      setCategories(c);
      setHalls(h);
      setBusinesses(b);
    } catch (e) {
      console.error('Failed to load marketplace data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  // H-05: run pending sweeps (48h auto-confirm, 30-day recycle purge) on app
  // start and every 5 minutes. In Supabase mode this is a no-op: pg_cron owns
  // the schedule (see schema section 10); in demo mode the mock repo sweeps.
  useEffect(() => {
    repo.runScheduledSweeps().catch((e) => console.error('Scheduled sweep failed', e));
    const timer = setInterval(() => {
      repo.runScheduledSweeps().catch((e) => console.error('Scheduled sweep failed', e));
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // BUG-1: logout from anywhere (Navbar menu, another tab) closes every open
  // modal and drawer so no signed-in view lingers for a guest.
  useEffect(() => {
    const closeAllOverlays = () => {
      setSelectedListing(null);
      setSelectedProfileUserId(null);
      setSelectedBusinessId(null);
      setSelectedOrder(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      setIsChatOpen(false);
      setIsNotificationsOpen(false);
      setIsCreateListingOpen(false);
      setIsCreateBusinessOpen(false);
      setIsSellerApplyOpen(false);
      setIsRecycleBinOpen(false);
      setIsAdminOpen(false);
      setIsAuthOpen(false);
      setReviewTarget(null);
    };
    window.addEventListener('oja:logout', closeAllOverlays);
    return () => window.removeEventListener('oja:logout', closeAllOverlays);
  }, []);

  const sellerMap: Record<string, UserProfile> = {};
  for (const u of allUsers) {
    sellerMap[u.id] = u;
  }

  const selectedProfileUser = selectedProfileUserId
    ? allUsers.find((u) => u.id === selectedProfileUserId) || null
    : null;

  const selectedBusiness = selectedBusinessId
    ? businesses.find((b) => b.id === selectedBusinessId) || null
    : null;

  const userBusinesses = businesses.filter((b) => b.ownerId === currentUser?.id);

  const handleOpenChatWithUser = (targetId: string, refOrder?: Order) => {
    setChatTargetUserId(targetId);
    setChatReferencedOrder(refOrder);
    setIsChatOpen(true);
  };

  const handleOpenStorefront = (bizId: string) => {
    setSelectedBusinessId(bizId);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-main)] transition-colors">
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenChat={() => {
          setChatTargetUserId(undefined);
          setChatReferencedOrder(undefined);
          setIsChatOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCreateListing={() => setIsCreateListingOpen(true)}
        onOpenProfile={(uid) => setSelectedProfileUserId(uid || currentUser?.id || null)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSellerApply={() => setIsSellerApplyOpen(true)}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        onOpenCreateBusiness={() => setIsCreateBusinessOpen(true)}
        onOpenSellerPortal={() => setIsSellerPortalOpen(true)}
        onOpenAgentPortal={() => setIsAgentPortalOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <MarketplaceHome
        listings={listings}
        categories={categories}
        halls={halls}
        allUsers={allUsers}
        onSelectListing={(listing) => setSelectedListing(listing)}
        onOpenCreateListing={() => setIsCreateListingOpen(true)}
        onOpenSellerApply={() => setIsSellerApplyOpen(true)}
      />

      {/* MODALS & DRAWERS */}
      {selectedListing && (
        <ProductDetailModal
          listing={selectedListing}
          seller={sellerMap[selectedListing.sellerId]}
          business={businesses.find((b) => b.id === selectedListing.businessId)}
          onClose={() => setSelectedListing(null)}
          onOpenProfile={(uid) => {
            setSelectedListing(null);
            setSelectedProfileUserId(uid);
          }}
          onOpenStorefront={(bizId) => {
            setSelectedListing(null);
            setSelectedBusinessId(bizId);
          }}
          onOpenChatWith={(targetId) => {
            setSelectedListing(null);
            handleOpenChatWithUser(targetId);
          }}
        />
      )}

      {selectedProfileUser && (
        <ProfileModal
          user={selectedProfileUser}
          listings={listings}
          onClose={() => setSelectedProfileUserId(null)}
          onOpenChatWith={(uid) => {
            setSelectedProfileUserId(null);
            handleOpenChatWithUser(uid);
          }}
          onSelectListing={(item) => {
            setSelectedProfileUserId(null);
            setSelectedListing(item);
          }}
          onOpenSellerApply={() => {
            setSelectedProfileUserId(null);
            setIsSellerApplyOpen(true);
          }}
        />
      )}

      {selectedBusiness && (
        <BusinessStorefrontModal
          business={selectedBusiness}
          listings={listings}
          sellerMap={sellerMap}
          onClose={() => setSelectedBusinessId(null)}
          onSelectListing={(item) => {
            setSelectedBusinessId(null);
            setSelectedListing(item);
          }}
          onUpdate={(updated) =>
            setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          // BUG-1 guest view: browsing works, but checkout needs an account.
          if (!currentUser) {
            setIsCartOpen(false);
            setIsAuthOpen(true);
            return;
          }
          setIsCheckoutOpen(true);
        }}
        onViewOrder={(ord) => setSelectedOrder(ord)}
      />

      {isCheckoutOpen && (
        <CheckoutModal
          halls={halls}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSuccess={(ord) => {
            setSelectedOrder(ord);
            loadMarketplaceData();
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          people={sellerMap}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={async () => {
            const all = await repo.getAllOrders();
            const updated = all.find((o) => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
            loadMarketplaceData();
          }}
          onOpenReviewModal={(listingId, subOrderId, orderId, agentId) => {
            setSelectedOrder(null);
            setReviewTarget({ listingId, subOrderId, orderId, agentId });
          }}
        />
      )}

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        targetUserId={chatTargetUserId}
        referencedOrder={chatReferencedOrder}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateToOrder={async (ordId) => {
          const ord = (await repo.getAllOrders()).find((o) => o.id === ordId);
          if (ord) setSelectedOrder(ord);
        }}
      />

      {isCreateListingOpen && (
        <CreateListingModal
          categories={categories}
          userBusinesses={userBusinesses}
          onClose={() => setIsCreateListingOpen(false)}
          onCreated={loadMarketplaceData}
        />
      )}

      {isCreateBusinessOpen && (
        <CreateBusinessModal
          categories={categories}
          onClose={() => setIsCreateBusinessOpen(false)}
          onCreated={loadMarketplaceData}
        />
      )}

      {isSellerApplyOpen && (
        <SellerApplyModal
          onClose={() => setIsSellerApplyOpen(false)}
          onSubmitted={async () => {
            await refreshUser();
            loadMarketplaceData();
          }}
        />
      )}

      {isRecycleBinOpen && (
        <RecycleBinModal
          onClose={() => setIsRecycleBinOpen(false)}
          onListingsUpdated={loadMarketplaceData}
        />
      )}

      {isSellerPortalOpen && currentUser && (
        <SellerPortalModal
          businesses={businesses}
          onClose={() => setIsSellerPortalOpen(false)}
          onViewOrder={(ord) => {
            setIsSellerPortalOpen(false);
            setSelectedOrder(ord);
          }}
          onOpenChatWith={(uid, refOrder) => {
            setIsSellerPortalOpen(false);
            handleOpenChatWithUser(uid, refOrder);
          }}
          onOpenCreateListing={() => {
            setIsSellerPortalOpen(false);
            setIsCreateListingOpen(true);
          }}
          onOpenRecycleBin={() => {
            setIsSellerPortalOpen(false);
            setIsRecycleBinOpen(true);
          }}
        />
      )}

      {isAgentPortalOpen && currentUser && (
        <AgentPortalModal
          onClose={() => setIsAgentPortalOpen(false)}
          onViewOrder={(ord) => {
            setIsAgentPortalOpen(false);
            setSelectedOrder(ord);
          }}
          onOpenChatWith={(uid, refOrder) => {
            setIsAgentPortalOpen(false);
            handleOpenChatWithUser(uid, refOrder);
          }}
        />
      )}

      {isAdminOpen && (
        <AdminDashboard
          onClose={() => setIsAdminOpen(false)}
          onRefreshData={async () => {
            await refreshUser();
            loadMarketplaceData();
          }}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          halls={halls}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          listingId={reviewTarget.listingId}
          subOrderId={reviewTarget.subOrderId}
          orderId={reviewTarget.orderId}
          agentId={reviewTarget.agentId}
          onClose={() => setReviewTarget(null)}
          onSubmitted={loadMarketplaceData}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
