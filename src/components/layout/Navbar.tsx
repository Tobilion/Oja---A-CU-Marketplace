/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShoppingBag,
  MessageSquare,
  Bell,
  Sun,
  Moon,
  Plus,
  ShieldCheck,
  ChevronDown,
  Layers,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { formatHallName } from '../../utils/formatHall';
import { resetDemoData } from '../../data/mockStorage';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenCreateListing: () => void;
  onOpenProfile: (userId?: string) => void;
  onOpenAdmin: () => void;
  onOpenSellerApply: () => void;
  onOpenRecycleBin: () => void;
  onOpenCreateBusiness: () => void;
  onOpenSellerPortal: () => void;
  onOpenAgentPortal: () => void;
  onOpenFeedback: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenChat,
  onOpenNotifications,
  onOpenCreateListing,
  onOpenProfile,
  onOpenAdmin,
  onOpenSellerApply,
  onOpenRecycleBin,
  onOpenCreateBusiness,
  onOpenSellerPortal,
  onOpenAgentPortal,
  onOpenFeedback,
  onOpenAuth,
}) => {
  const { currentUser, allUsers, switchUser, isMock, signOut } = useAuth();
  const { mode, isYorubaTheme, toggleMode, toggleYorubaTheme } = useTheme();
  const { totalItemCount, clearCart } = useCart();
  const { unreadCount } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const isAdmin = currentUser?.adminLevel != null || currentUser?.badges.includes('Admin');

  // BUG-1: logout clears the session, the persisted cart, and every open
  // overlay (App listens for oja:logout), and never re-authenticates: the
  // persona bar only switches when explicitly picked.
  const handleLogout = async () => {
    setShowUserMenu(false);
    setShowRoleSwitcher(false);
    await signOut();
    clearCart();
    window.dispatchEvent(new Event('oja:logout'));
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] transition-colors">
      {/* Demo Mode / Environment Helper Banner */}
      {IS_DEMO_MODE && isMock && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-1 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Demo Mode (Local Database active · All orders, fees, RLS simulated)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenFeedback}
              className="hover:underline font-semibold text-amber-800 dark:text-amber-300"
            >
              Report issue or idea
            </button>
            <button
              onClick={() => {
                if (confirm('Reset all demo data to the original seed? Your demo changes will be lost.')) {
                  resetDemoData();
                }
              }}
              className="hover:underline font-semibold text-amber-800 dark:text-amber-300"
            >
              Reset demo data
            </button>
            <button
              onClick={() => setShowRoleSwitcher((prev) => !prev)}
              className="hover:underline flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300"
            >
              <span>Role Switcher</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Role Switcher Drawer / Dropdown */}
      {IS_DEMO_MODE && isMock && showRoleSwitcher && (
        <div className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] p-3 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-text-muted)] font-medium">Switch Active Persona:</span>
            {allUsers.slice(0, 7).map((u) => {
              const active = u.id === currentUser?.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setShowRoleSwitcher(false);
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-[var(--color-brand-primary)] text-white font-medium'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  <span>{u.fullName.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    ({u.adminLevel ? 'Admin' : u.badges.includes('Delivery Agent') ? 'Agent' : u.badges.includes('Seller') ? 'Seller' : 'Buyer'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Top Navigation (Strict 3-zone contract) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single element wordmark brand mark */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display font-extrabold text-2xl tracking-tight text-[var(--color-text-main)] flex items-center gap-1.5"
          >
            <span className="text-[var(--color-brand-primary)]">Oja</span>
            <span className="text-xs font-mono font-normal tracking-normal text-[var(--color-text-muted)] hidden sm:inline">
              Covenant
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links (Clean unboxed text links) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-text-muted)]">
          <a
            href="#explore"
            className="hover:text-[var(--color-text-main)] transition-colors whitespace-nowrap"
          >
            Explore Market
          </a>
          <button
            onClick={() => onOpenProfile(currentUser?.id)}
            className="hover:text-[var(--color-text-main)] transition-colors whitespace-nowrap"
          >
            My Store & Hall
          </button>
          {(currentUser?.isSellerApproved || currentUser?.badges.includes('Business Owner')) && (
            <button
              onClick={onOpenSellerPortal}
              className="hover:text-[var(--color-text-main)] transition-colors whitespace-nowrap"
            >
              Seller Portal
            </button>
          )}
          {currentUser?.badges.includes('Delivery Agent') && (
            <button
              onClick={onOpenAgentPortal}
              className="hover:text-[var(--color-text-main)] transition-colors whitespace-nowrap"
            >
              Deliveries
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-[var(--color-brand-primary)] font-semibold hover:opacity-80 transition-opacity flex items-center gap-1 whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Today</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Post Listing Button */}
          <button
            onClick={currentUser ? (currentUser.isSellerApproved ? onOpenCreateListing : onOpenSellerApply) : onOpenAuth}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[var(--color-brand-primary)] rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sell on Oja</span>
            <span className="sm:hidden">Sell</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            aria-label="View Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--color-brand-gold)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center tabular-nums">
                {totalItemCount}
              </span>
            )}
          </button>

          {/* Chat Messages Trigger */}
          <button
            onClick={onOpenChat}
            className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            aria-label="Open Direct Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] transition-colors"
            aria-label="Open Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute 1 top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--color-surface)]" />
            )}
          </button>

          {/* Theme & Yoruba Cultural Toggle */}
          <div className="flex items-center border-l border-[var(--color-border)] pl-2 ml-1 gap-1">
            <button
              onClick={toggleMode}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              title={mode === 'dark' ? 'Switch to Light Cream' : 'Switch to Dark Matte'}
              aria-label="Toggle Light/Dark Theme"
            >
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleYorubaTheme}
              className={`p-1.5 rounded-md transition-colors ${
                isYorubaTheme
                  ? 'text-[var(--color-brand-gold)] bg-[var(--color-surface-subtle)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
              title="Toggle Adire Indigo & Terracotta Theme"
              aria-label="Toggle Yoruba Theme"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile / Menu Trigger */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors"
                aria-label="User account menu"
              >
                <img
                  src={currentUser.avatarUrl || '/seed/avatar-default.svg'}
                  alt={currentUser.fullName}
                  className="w-8 h-8 rounded-full border border-[var(--color-border)] object-cover bg-neutral-200"
                  referrerPolicy="no-referrer"
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-[var(--color-border)]">
                    <p className="text-sm font-semibold text-[var(--color-text-main)] truncate">{currentUser.fullName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">@{currentUser.username}</p>
                      <p className="text-[11px] font-mono text-[var(--color-brand-primary)] mt-0.5">
                        {formatHallName(currentUser.hallId)} · {currentUser.roomNumber}
                      </p>
                  </div>

                  <div className="py-1 text-xs">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenProfile(currentUser.id);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)]"
                    >
                      View Public Profile
                    </button>
                    {!currentUser.isSellerApproved && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSellerApply();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-brand-primary)] font-medium"
                      >
                        Apply for Seller Badge
                      </button>
                    )}
                    {(currentUser.isSellerApproved || currentUser.badges.includes('Business Owner')) && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSellerPortal();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] font-medium"
                      >
                        Seller Portal
                      </button>
                    )}
                    {currentUser.badges.includes('Delivery Agent') && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAgentPortal();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)] font-medium"
                      >
                        Deliveries
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenCreateBusiness();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)]"
                    >
                      Register Business
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenRecycleBin();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-main)]"
                    >
                      Recycle Bin
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-[var(--color-brand-gold)] font-medium"
                      >
                        Admin Operations
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--color-surface-subtle)] text-red-600 dark:text-red-400 font-medium flex items-center gap-2 border-t border-[var(--color-border)] mt-1 pt-2.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs font-semibold px-3 py-1.5 bg-[var(--color-text-main)] text-[var(--color-bg-base)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
