/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryMode } from '../types';

export interface SellerDeliveryInput {
  sellerId: string;
  sellerHallId: string;
  sellerName?: string;
  subtotal: number; // in naira
  itemCount: number; // total quantity of items for this seller
}

export interface SellerFeeBreakdown {
  sellerId: string;
  sellerHallId: string;
  sellerName?: string;
  subtotal: number;
  itemCount: number;
  baseFee: number;
  qualifiesForHallDiscount: boolean;
  discountAmount: number;
  finalFee: number;
}

export interface OrderDeliveryFeeResult {
  deliveryMode: DeliveryMode;
  sellerBreakdowns: SellerFeeBreakdown[];
  totalBaseFee: number;
  totalDiscount: number;
  finalTotalDeliveryFee: number;
}

/**
 * Calculates the base fee for a single seller sub-order before hall discounts:
 * ₦500 if that seller's subtotal is < ₦10,000 AND item count is < 5.
 * Otherwise ₦1,000 (i.e. >= ₦10,000 or >= 5 items is ₦1,000).
 */
export function calculateSellerBaseFee(subtotal: number, itemCount: number): number {
  if (subtotal < 10000 && itemCount < 5) {
    return 500;
  }
  return 1000;
}

/**
 * Calculates delivery fees for an entire order with multi-seller sub-orders,
 * taking into account delivery mode and same-hall discounts.
 */
export function calculateOrderDeliveryFee(
  sellers: SellerDeliveryInput[],
  deliveryMode: DeliveryMode
): OrderDeliveryFeeResult {
  if (deliveryMode === 'pickup' || sellers.length === 0) {
    return {
      deliveryMode,
      sellerBreakdowns: sellers.map((s) => ({
        sellerId: s.sellerId,
        sellerHallId: s.sellerHallId,
        sellerName: s.sellerName,
        subtotal: s.subtotal,
        itemCount: s.itemCount,
        baseFee: 0,
        qualifiesForHallDiscount: false,
        discountAmount: 0,
        finalFee: 0,
      })),
      totalBaseFee: 0,
      totalDiscount: 0,
      finalTotalDeliveryFee: 0,
    };
  }

  // Count sellers per hall to identify halls with 2+ sellers
  const hallCounts: Record<string, number> = {};
  for (const s of sellers) {
    if (s.sellerHallId) {
      hallCounts[s.sellerHallId] = (hallCounts[s.sellerHallId] || 0) + 1;
    }
  }

  const sellerBreakdowns: SellerFeeBreakdown[] = sellers.map((s) => {
    const baseFee = calculateSellerBaseFee(s.subtotal, s.itemCount);
    const hasSameHallColleagues = (hallCounts[s.sellerHallId] || 0) >= 2;
    // 50% discount on delivery fee if 2+ sellers in the order share the same hall
    const discountAmount = hasSameHallColleagues ? Math.round(baseFee * 0.5) : 0;
    const finalFee = baseFee - discountAmount;

    return {
      sellerId: s.sellerId,
      sellerHallId: s.sellerHallId,
      sellerName: s.sellerName,
      subtotal: s.subtotal,
      itemCount: s.itemCount,
      baseFee,
      qualifiesForHallDiscount: hasSameHallColleagues,
      discountAmount,
      finalFee,
    };
  });

  const totalBaseFee = sellerBreakdowns.reduce((sum, b) => sum + b.baseFee, 0);
  const totalDiscount = sellerBreakdowns.reduce((sum, b) => sum + b.discountAmount, 0);
  const finalTotalDeliveryFee = sellerBreakdowns.reduce((sum, b) => sum + b.finalFee, 0);

  return {
    deliveryMode,
    sellerBreakdowns,
    totalBaseFee,
    totalDiscount,
    finalTotalDeliveryFee,
  };
}

/**
 * Calculates late delivery penalties.
 * If actual completion exceeds promised deadline:
 * 5% of subtotal per day late (minimum ₦200, maximum 50% of subtotal).
 * If 2 or more days late, isAlertLevel is true.
 */
export function calculateLatePenalty(
  subtotal: number,
  hoursLate: number
): { penaltyAmount: number; daysLate: number; isAlertLevel: boolean } {
  if (hoursLate <= 0) {
    return { penaltyAmount: 0, daysLate: 0, isAlertLevel: false };
  }

  const daysLate = Math.ceil(hoursLate / 24);
  const dailyRate = Math.round(subtotal * 0.05);
  const rawPenalty = daysLate * Math.max(200, dailyRate);
  const maxPenalty = Math.round(subtotal * 0.5); // Cap at 50%
  const penaltyAmount = Math.min(rawPenalty, maxPenalty);

  return {
    penaltyAmount,
    daysLate,
    isAlertLevel: daysLate >= 2,
  };
}
