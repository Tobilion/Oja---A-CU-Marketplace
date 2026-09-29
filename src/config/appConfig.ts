/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Global Oja Application Configuration
 */

// Controls whether photos are required when publishing listings
export const REQUIRE_LISTING_PHOTOS = false;

// Application run mode: 'demo' strictly requires VITE_APP_MODE=demo.
// In any other build (production, staging, or undefined), demo flags and role switchers are strictly disabled.
const rawAppMode =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_MODE) ||
  (typeof process !== 'undefined' && process.env?.VITE_APP_MODE) ||
  '';

export const IS_DEMO_MODE = rawAppMode === 'demo';
export const APP_MODE: 'demo' | 'production' = IS_DEMO_MODE ? 'demo' : 'production';

// Strict Admin Level Role-Based Permissions
import { AdminLevel } from '../types';

export function isSuperAdmin(level?: AdminLevel | null): boolean {
  return level === 'super_admin';
}

export function canVerifyPayments(level?: AdminLevel | null): boolean {
  return level === 'super_admin' || level === 'payment_verifier';
}

export function canManageLogistics(level?: AdminLevel | null): boolean {
  return level === 'super_admin' || level === 'logistics_admin';
}

export function canModerate(level?: AdminLevel | null): boolean {
  return level === 'super_admin' || level === 'moderator';
}

// Financial & Operational Defaults
export const DEFAULT_LATE_PENALTY_RATE_PERCENT = 5; // 5% per day late
export const DEFAULT_AUTO_CONFIRM_HOURS = 48; // Auto-confirm 48h after delivery
export const DEFAULT_RECYCLE_PURGE_DAYS = 30; // Auto-purge recycle bin after 30 days
export const LATE_ALERT_THRESHOLD_HOURS = 48; // Alert admin if 2+ days late

// Founding Super Admins (Protected from demotion/suspension)
export const FOUNDING_SUPER_ADMIN_EMAILS = [
  'tobilobajagun@gmail.com',
  'ejagun.2401221@stu.cu.edu.ng',
];

export const OJA_BRAND_NAME = 'Oja';

export const APP_VERSION = '0.1.0';

// 6.3 feedback destinations (human-owned, safe to ship in client code).
export const FEEDBACK_WHATSAPP_NUMBER = '2347073948340';
export const FEEDBACK_EMAIL = 'tobilobajagun@gmail.com';
