/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  Listing,
  Business,
  Order,
  Review,
  Report,
  ChatThread,
  ChatMessage,
  AppNotification,
  AuditLogEntry,
  AppSettings,
  Hall,
  Category,
} from '../types';
import { SEED_USERS, SEED_BUSINESSES } from './seedUsers';
import { SEED_LISTINGS } from './seedListings';
import {
  SEED_ORDERS,
  SEED_REVIEWS,
  SEED_REPORTS,
  SEED_CHAT_THREADS,
  SEED_CHAT_MESSAGES,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
} from './seedOrders';
import { INITIAL_HALLS } from '../utils/halls';
import { DEFAULT_CATEGORIES } from '../utils/taxonomy';

const STORAGE_PREFIX = 'oja_db_v1_';

// Exported for the cross-tab logout listener in AuthContext.
export const CURRENT_USER_STORAGE_KEY = STORAGE_PREFIX + 'current_user_id';

// Sentinel meaning "signed out". Stored explicitly so it survives refresh,
// unlike a removed key (which loadOrSeed would re-seed with the demo admin).
const LOGGED_OUT = '__logged_out__';

/**
 * BUG-1: pure session resolution, unit-tested in logout.test.ts.
 * A stored null/empty/sentinel means guest (never fall back to users[0],
 * which re-logged someone in after every logout and refresh).
 */
export function pickCurrentUser(storedId: string | null, users: UserProfile[]): UserProfile | null {
  if (!storedId || storedId === LOGGED_OUT) return null;
  return users.find((u) => u.id === storedId) || null;
}

function loadOrSeed<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e: any) {
    // M-04: localStorage quota is finite (~5MB). Compression (imageCompress)
    // keeps listings small; if the quota is still exceeded, tell the user
    // visibly instead of failing silently.
    console.error('Failed to save to mock storage', e);
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      window.dispatchEvent(new Event('oja:storage-full'));
    }
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  ojaBankName: 'Kuda Microfinance Bank',
  ojaAccountNumber: '2001928374',
  ojaAccountName: 'Oja Escrow Operations',
  deliveryPromiseHours: 48,
  latePenaltyRatePercent: 5,
  lateThresholdDaysAlert: 2,
};

export const MockStorage = {
  getUsers: (): UserProfile[] => loadOrSeed('users', SEED_USERS),
  setUsers: (users: UserProfile[]) => save('users', users),

  getCurrentUserId: (): string | null => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      // Absent key = first run: seed the demo admin persona. An explicit
      // stored null means the user logged out: stay a guest.
      if (raw === null) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify('user_tobi_super_admin'));
        return 'user_tobi_super_admin';
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setCurrentUserId: (id: string | null) => save('current_user_id', id),

  getListings: (): Listing[] => loadOrSeed('listings', SEED_LISTINGS),
  setListings: (listings: Listing[]) => save('listings', listings),

  getBusinesses: (): Business[] => loadOrSeed('businesses', SEED_BUSINESSES),
  setBusinesses: (businesses: Business[]) => save('businesses', businesses),

  getOrders: (): Order[] => loadOrSeed('orders', SEED_ORDERS),
  setOrders: (orders: Order[]) => save('orders', orders),

  getReviews: (): Review[] => loadOrSeed('reviews', SEED_REVIEWS),
  setReviews: (reviews: Review[]) => save('reviews', reviews),

  getReports: (): Report[] => loadOrSeed('reports', SEED_REPORTS),
  setReports: (reports: Report[]) => save('reports', reports),

  getThreads: (): ChatThread[] => loadOrSeed('threads', SEED_CHAT_THREADS),
  setThreads: (threads: ChatThread[]) => save('threads', threads),

  getMessages: (): ChatMessage[] => loadOrSeed('messages', SEED_CHAT_MESSAGES),
  setMessages: (messages: ChatMessage[]) => save('messages', messages),

  getNotifications: (): AppNotification[] => loadOrSeed('notifications', SEED_NOTIFICATIONS),
  setNotifications: (notifications: AppNotification[]) => save('notifications', notifications),

  getAuditLogs: (): AuditLogEntry[] => loadOrSeed('audit_logs', SEED_AUDIT_LOGS),
  setAuditLogs: (logs: AuditLogEntry[]) => save('audit_logs', logs),

  getSettings: (): AppSettings => loadOrSeed('settings', DEFAULT_SETTINGS),
  setSettings: (settings: AppSettings) => save('settings', settings),

  getHalls: (): Hall[] => loadOrSeed('halls', INITIAL_HALLS),
  setHalls: (halls: Hall[]) => save('halls', halls),

  getCategories: (): Category[] => loadOrSeed('categories', DEFAULT_CATEGORIES),
  setCategories: (categories: Category[]) => save('categories', categories),

  getEmailOutbox: (): any[] => loadOrSeed('email_outbox', []),
  setEmailOutbox: (emails: any[]) => save('email_outbox', emails),
};
