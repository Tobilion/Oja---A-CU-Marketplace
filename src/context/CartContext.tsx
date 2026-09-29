/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Listing, DeliveryMode } from '../types';
import { calculateOrderDeliveryFee, OrderDeliveryFeeResult } from '../utils/deliveryFee';
import { useAuth } from './AuthContext';

export interface CartItem {
  listing: Listing;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  deliveryMode: DeliveryMode;
  setDeliveryMode: (mode: DeliveryMode) => void;
  addToCart: (listing: Listing, quantity?: number) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  totalItemCount: number;
  itemsSubtotal: number;
  feeBreakdownResult: OrderDeliveryFeeResult;
  finalTotalAmount: number;
  sellerCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'oja_active_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { allUsers } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('room_delivery');

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const addToCart = (listing: Listing, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.listing.id === listing.id);
      if (existing) {
        const newQty = Math.min(listing.stock, existing.quantity + quantity);
        return prev.map((item) =>
          item.listing.id === listing.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { listing, quantity: Math.min(listing.stock, quantity) }];
    });
  };

  const removeFromCart = (listingId: string) => {
    setCart((prev) => prev.filter((item) => item.listing.id !== listingId));
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(listingId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.listing.id === listingId
          ? { ...item, quantity: Math.min(item.listing.stock, quantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const itemsSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);
  }, [cart]);

  // Aggregate items by seller
  const sellerInputs = useMemo(() => {
    const map: Record<string, { subtotal: number; itemCount: number }> = {};
    for (const item of cart) {
      const sId = item.listing.sellerId;
      if (!map[sId]) {
        map[sId] = { subtotal: 0, itemCount: 0 };
      }
      map[sId].subtotal += item.listing.price * item.quantity;
      map[sId].itemCount += item.quantity;
    }

    return Object.entries(map).map(([sellerId, data]) => {
      const user = allUsers.find((u) => u.id === sellerId);
      return {
        sellerId,
        sellerHallId: user?.hallId || 'hall_peter',
        sellerName: user?.fullName,
        subtotal: data.subtotal,
        itemCount: data.itemCount,
      };
    });
  }, [cart, allUsers]);

  const feeBreakdownResult = useMemo(() => {
    return calculateOrderDeliveryFee(sellerInputs, deliveryMode);
  }, [sellerInputs, deliveryMode]);

  const finalTotalAmount = useMemo(() => {
    return itemsSubtotal + feeBreakdownResult.finalTotalDeliveryFee;
  }, [itemsSubtotal, feeBreakdownResult]);

  const sellerCount = useMemo(() => {
    return Object.keys(sellerInputs).length;
  }, [sellerInputs]);

  return (
    <CartContext.Provider
      value={{
        cart,
        deliveryMode,
        setDeliveryMode,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItemCount,
        itemsSubtotal,
        feeBreakdownResult,
        finalTotalAmount,
        sellerCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
