/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { AppRoutes } from './routes/AppRoutes';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { paths, withNext } from './routes/paths';
import { CreateBusinessModal } from './components/business/CreateBusinessModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { CreateListingModal } from './components/listings/CreateListingModal';
import { SellerApplyModal } from './components/seller/SellerApplyModal';
import { RecycleBinModal } from './components/seller/RecycleBinModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SellerPortalModal } from './components/seller/SellerPortalModal';
import { AgentPortalModal } from './components/delivery/AgentPortalModal';
import { Footer } from './components/layout/Footer';
import { Listing, Category, Hall, Business } from './types';
import { repo, isSupabaseConfigMissing } from './data';
import { AlertOctagon, Terminal, MessageCircle, LoaderCircle } from 'lucide-react';
import { FeedbackModal } from './components/feedback/FeedbackModal';
import { installGlobalFeedbackCapture, logUserAction } from './utils/feedback';
import { MARKETPLACE_REFRESH_EVENT } from './utils/marketplaceRefresh';

function AppContent() {
  const { currentUser, allUsers, refreshUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [feedbackContext, setFeedbackContext] = useState<string | null>(null);
  // Captured at mount: supabase-js strips the session hash from the URL shortly
  // after processing it, so this is read once before any re-render.
  const [returningFromAuthLink] = useState(() =>
    /(?:^|[#&])access_token=/.test(window.location.hash)
  );

  useScrollRestoration();

  useEffect(() => {
    installGlobalFeedbackCapture();
  }, []);

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
            <p className="text-amber-400">1. For local testing & review: unset VITE_APP_MODE or set it to demo in .env</p>
            <p className="text-sky-400">2. For live deployment: execute supabase/schema.sql and supply valid credentials.</p>
          </div>
          <button
            onClick={() => {
              logUserAction('open feedback (error-screen)');
              setFeedbackContext('error-screen');
            }}
            className="w-full px-4 py-2 rounded-xl border border-neutral-700 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Report an Issue
          </button>
        </div>
        {feedbackContext && <FeedbackModal context={feedbackContext} onClose={() => setFeedbackContext(null)} />}
      </div>
    );
  }

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  // Visible when the database is unreachable (DNS/filtered network), so an
  // empty marketplace is never mistaken for an empty database.
  const [connectivityError, setConnectivityError] = useState(false);

  // Active Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isSellerApplyOpen, setIsSellerApplyOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSellerPortalOpen, setIsSellerPortalOpen] = useState(false);
  const [isAgentPortalOpen, setIsAgentPortalOpen] = useState(false);

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
      setConnectivityError(false);
    } catch (e) {
      console.error('Failed to load marketplace data', e);
      setConnectivityError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  // Route pages (checkout, order detail) announce data-changing actions so
  // shared marketplace data stays fresh without prop drilling.
  useEffect(() => {
    const refresh = () => {
      void loadMarketplaceData();
    };
    window.addEventListener(MARKETPLACE_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(MARKETPLACE_REFRESH_EVENT, refresh);
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
      setIsCartOpen(false);
      setIsNotificationsOpen(false);
      setIsCreateListingOpen(false);
      setIsCreateBusinessOpen(false);
      setIsSellerApplyOpen(false);
      setIsRecycleBinOpen(false);
      setIsAdminOpen(false);
      setIsSellerPortalOpen(false);
      setIsAgentPortalOpen(false);
      setFeedbackContext(null);
    };
    window.addEventListener('oja:logout', closeAllOverlays);
    return () => window.removeEventListener('oja:logout', closeAllOverlays);
  }, []);

  const userBusinesses = businesses.filter((b) => b.ownerId === currentUser?.id);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-main)] transition-colors">
      {returningFromAuthLink && isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-base)]">
          <div className="font-display font-extrabold text-3xl tracking-tight text-[var(--color-text-main)]">
            <span className="text-[var(--color-brand-primary)]">Oja</span>
            <span className="text-sm font-mono font-normal tracking-normal text-[var(--color-text-muted)] ml-1.5">
              Covenant
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>Signing you in…</span>
          </div>
        </div>
      )}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenChat={() => navigate(paths.messages)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCreateListing={() => setIsCreateListingOpen(true)}
        onOpenProfile={(uid) => {
          const target = allUsers.find((u) => u.id === (uid || currentUser?.id));
          if (target) navigate(paths.profile(target.username));
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSellerApply={() => setIsSellerApplyOpen(true)}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        onOpenCreateBusiness={() => setIsCreateBusinessOpen(true)}
        onOpenSellerPortal={() => setIsSellerPortalOpen(true)}
        onOpenAgentPortal={() => setIsAgentPortalOpen(true)}
        onOpenFeedback={() => {
          logUserAction('open feedback (demo-bar)');
          setFeedbackContext('demo-bar');
        }}
        onOpenAuth={() => navigate(paths.login)}
      />

      {connectivityError && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-800 dark:text-red-300 px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <span>
            <strong>Can't reach the Oja database.</strong> Check your connection (some campus networks block
            external services), disable ad-blockers/VPN, then retry.
          </span>
          <button
            onClick={() => {
              setLoading(true);
              setConnectivityError(false);
              loadMarketplaceData();
            }}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <AppRoutes
        listings={listings}
        categories={categories}
        halls={halls}
        allUsers={allUsers}
        onOpenCreateListing={() => setIsCreateListingOpen(true)}
        onOpenSellerApply={() => setIsSellerApplyOpen(true)}
      />

      {/* MODALS & DRAWERS */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          // BUG-1 guest view: browsing works, but checkout needs an account.
          if (!currentUser) {
            navigate(withNext(paths.login, paths.checkout));
            return;
          }
          navigate(paths.checkout);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={(n) => {
          if (!n.linkId) return;
          if (n.type === 'business') {
            navigate(paths.store(n.linkId));
            return;
          }
          if (n.type === 'order' || n.type === 'delivery' || n.type === 'seller') {
            navigate(paths.order(n.linkId));
          }
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
            navigate(paths.order(ord.id));
          }}
          onOpenChatWith={async (uid, refOrder) => {
            setIsSellerPortalOpen(false);
            if (!currentUser) return;
            const thread = await repo.ensureThread(currentUser.id, uid);
            navigate(paths.messageThread(thread.id), refOrder ? { state: { referencedOrder: refOrder } } : undefined);
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
            navigate(paths.order(ord.id));
          }}
          onOpenChatWith={async (uid, refOrder) => {
            setIsAgentPortalOpen(false);
            if (!currentUser) return;
            const thread = await repo.ensureThread(currentUser.id, uid);
            navigate(paths.messageThread(thread.id), refOrder ? { state: { referencedOrder: refOrder } } : undefined);
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

      <Footer />

      {/* 6.3 floating feedback button on every screen */}
      <button
        onClick={() => {
          logUserAction('open feedback (floating-button)');
          setFeedbackContext('floating-button');
        }}
        aria-label="Report issue or idea"
        title="Report issue or idea"
        className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-[var(--color-brand-primary)] text-white shadow-xl hover:opacity-90 transition-opacity"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {feedbackContext && <FeedbackModal context={feedbackContext} onClose={() => setFeedbackContext(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
