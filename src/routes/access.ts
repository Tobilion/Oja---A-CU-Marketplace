/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminLevel, UserBadge, UserProfile } from '../types';

export type AccessRequirement = 'signed-in' | 'seller' | 'agent' | 'admin';
export type AccessDecision = 'allow' | 'login' | 'forbidden';

/**
 * Minimal shape needed for access checks, so the decision logic stays pure
 * and testable without constructing a full UserProfile.
 */
export interface AccessUser {
  isSellerApproved: boolean;
  badges: UserBadge[];
  adminLevel: AdminLevel | null;
}

export function toAccessUser(user: UserProfile | null): AccessUser | null {
  if (!user) return null;
  return {
    isSellerApproved: user.isSellerApproved,
    badges: user.badges,
    adminLevel: user.adminLevel ?? null,
  };
}

/**
 * Mirrors the role predicates the Navbar uses to show entry points
 * (isSellerApproved/Business Owner, Delivery Agent, adminLevel/Admin badge).
 */
export function meetsRequirement(user: AccessUser | null, requirement: AccessRequirement): boolean {
  if (!user) return false;
  switch (requirement) {
    case 'signed-in':
      return true;
    case 'seller':
      return user.isSellerApproved || user.badges.includes('Business Owner');
    case 'agent':
      return user.badges.includes('Delivery Agent');
    case 'admin':
      return user.adminLevel != null || user.badges.includes('Admin');
  }
}

export function accessDecision(user: AccessUser | null, requirement: AccessRequirement): AccessDecision {
  if (!user) return 'login';
  return meetsRequirement(user, requirement) ? 'allow' : 'forbidden';
}
