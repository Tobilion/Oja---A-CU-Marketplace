/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Package, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/money';
import { Order } from '../../types';
import { repo } from '../../data';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
  onViewOrder: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  onViewOrder,
}) => {
  const { cart, removeFromCart, updateQuantity, clearCart, itemsSubtotal, feeBreakdownResult, finalTotalAmount, deliveryMode, setDeliveryMode } = useCart();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'cart' | 'ongoing' | 'delivered'>('cart');
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      repo.getOrdersForUser(currentUser.id).then(setUserOrders);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const ongoingOrders = userOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const deliveredOrders = userOrders.filter((o) => o.status === 'completed' || o.status === 'delivered');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface)] h-full shadow-2xl flex flex-col border-l border-[var(--color-border)] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Your Orders & Bag</h2>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Tab Navigation: Current Cart / Ongoing Orders / Delivered Orders */}
        <div className="flex border-b border-[var(--color-border)] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'cart'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'ongoing'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Ongoing ({ongoingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === 'delivered'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            Delivered ({deliveredOrders.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-4 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">Your cart is empty</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Browse campus listings to add items</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Item List */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.listing.id}
                        className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center gap-3 text-xs"
                      >
                        <img
                          src={item.listing.images[0] || 'https://placehold.co/100x100/png'}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover bg-neutral-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[var(--color-text-main)] truncate">{item.listing.title}</h4>
                          <p className="text-xs font-mono font-bold text-[var(--color-text-main)] mt-0.5">
                            {formatNaira(item.listing.price)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center border border-[var(--color-border)] rounded-md bg-[var(--color-surface)]">
                              <button
                                onClick={() => updateQuantity(item.listing.id, item.quantity - 1)}
                                className="px-2 py-0.5 text-xs hover:bg-[var(--color-surface-subtle)]"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 text-xs font-mono font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.listing.id, item.quantity + 1)}
                                className="px-2 py-0.5 text-xs hover:bg-[var(--color-surface-subtle)]"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.listing.id)}
                              className="text-[var(--color-text-muted)] hover:text-red-500 p-1"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Mode Toggle */}
                  <div className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                    <span className="text-xs font-semibold text-[var(--color-text-main)]">Delivery Mode:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => setDeliveryMode('room_delivery')}
                        className={`p-2 rounded-lg font-medium text-left border transition-colors ${
                          deliveryMode === 'room_delivery'
                            ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border)]'
                        }`}
                      >
                        <div>Room Delivery</div>
                        <div className="text-[10px] opacity-80">By vetted hall runner</div>
                      </button>
                      <button
                        onClick={() => setDeliveryMode('pickup')}
                        className={`p-2 rounded-lg font-medium text-left border transition-colors ${
                          deliveryMode === 'pickup'
                            ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-main)] border-[var(--color-border)]'
                        }`}
                      >
                        <div>Pickup (₦0 Fee)</div>
                        <div className="text-[10px] opacity-80">At seller's room</div>
                      </button>
                    </div>
                  </div>

                  {/* Fee Breakdown Display */}
                  <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2 text-xs">
                    <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
                      Delivery Fee Breakdown
                    </span>
                    <div className="space-y-1 pt-1 text-[var(--color-text-muted)]">
                      {feeBreakdownResult.sellerBreakdowns.map((sb, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span>
                            Seller {i + 1} ({sb.sellerHallId.replace('hall_', '').toUpperCase()})
                            {sb.qualifiesForHallDiscount && (
                              <span className="text-[var(--color-brand-primary)] font-semibold ml-1">(-50% same hall)</span>
                            )}
                          </span>
                          <span className="font-mono tabular-nums text-[var(--color-text-main)]">
                            {formatNaira(sb.finalFee)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1 border-t border-[var(--color-border)] font-semibold text-[var(--color-text-main)]">
                        <span>Items Subtotal</span>
                        <span className="font-mono tabular-nums">{formatNaira(itemsSubtotal)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-[var(--color-text-main)]">
                        <span>Delivery Fee</span>
                        <span className="font-mono tabular-nums">{formatNaira(feeBreakdownResult.finalTotalDeliveryFee)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[var(--color-border)] text-sm font-bold text-[var(--color-text-main)]">
                        <span>Grand Total</span>
                        <span className="font-mono tabular-nums text-[var(--color-brand-primary)]">
                          {formatNaira(finalTotalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ongoing Orders Tab */}
          {activeTab === 'ongoing' && (
            <div className="space-y-3">
              {ongoingOrders.length === 0 ? (
                <p className="text-center text-xs text-[var(--color-text-muted)] py-12">No ongoing orders.</p>
              ) : (
                ongoingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      onClose();
                      onViewOrder(ord);
                    }}
                    className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[var(--color-text-main)]">{ord.orderNumber}</span>
                      <span className="capitalize font-semibold text-[var(--color-brand-gold)] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[var(--color-text-muted)]">
                      <span>{ord.subOrders.length} sub-order(s) · {ord.deliveryHallId.replace('hall_', '').toUpperCase()}</span>
                      <span className="font-mono font-bold text-[var(--color-text-main)]">{formatNaira(ord.totalAmount)}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-brand-primary)] flex items-center gap-1 pt-1 font-medium">
                      <span>Track timeline & delivery code</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Delivered Orders Tab */}
          {activeTab === 'delivered' && (
            <div className="space-y-3">
              {deliveredOrders.length === 0 ? (
                <p className="text-center text-xs text-[var(--color-text-muted)] py-12">No delivered orders yet.</p>
              ) : (
                deliveredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      onClose();
                      onViewOrder(ord);
                    }}
                    className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[var(--color-text-main)]">{ord.orderNumber}</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--color-text-muted)]">
                      <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      <span className="font-mono font-bold text-[var(--color-text-main)]">{formatNaira(ord.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Checkout CTA */}
        {activeTab === 'cart' && cart.length > 0 && (
          <div className="p-4 border-t border-[var(--color-border)] space-y-2">
            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3 px-4 bg-[var(--color-brand-primary)] hover:opacity-90 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
