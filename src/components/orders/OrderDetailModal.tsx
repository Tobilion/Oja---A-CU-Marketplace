/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Key,
  Star,
  MapPin,
  Building,
} from 'lucide-react';
import { Order, SubOrder, OrderState } from '../../types';
import { formatNaira } from '../../utils/money';
import { formatHallName } from '../../utils/formatHall';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated: () => void;
  onOpenReviewModal?: (listingId: string, subOrderId: string, orderId: string, agentId?: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
  onOpenReviewModal,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [selectedSubOrderId, setSelectedSubOrderId] = useState<string | null>(null);
  const [codeError, setCodeError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const modalRef = useModalEscape(true, onClose);

  const isBuyer = currentUser?.id === order.buyerId;
  const isSuperAdmin = currentUser?.adminLevel === 'super_admin' || currentUser?.badges.includes('Admin');

  // Order lifecycle states for timeline visualization
  const orderedStates: OrderState[] = [
    'awaiting_payment',
    'payment_confirmed',
    'seller_accepted',
    'ready',
    'agent_assigned',
    'picked_up',
    'out_for_delivery',
    'delivered',
    'completed',
  ];

  const handleSellerAccept = async (subOrderId: string) => {
    setIsProcessing(true);
    try {
      await repo.sellerAcceptSubOrder(order.id, subOrderId, 24, currentUser?.id);
      showToast('Sub-order accepted. Delivery window starts.', 'success');
      onOrderUpdated();
    } catch (err: any) {
      showToast(err?.message || 'Failed to accept sub-order', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdvanceStatus = async (subOrderId: string, next: OrderState, note?: string) => {
    setIsProcessing(true);
    try {
      await repo.advanceOrderStatus(order.id, subOrderId, next, note, currentUser?.id);
      showToast(`Status updated to ${next.replace(/_/g, ' ')}`, 'info');
      onOrderUpdated();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteDeliveryWithCode = async (subOrderId: string) => {
    if (deliveryCodeInput.trim() !== order.deliveryCode) {
      setCodeError(true);
      showToast('Invalid 4-digit delivery code', 'error');
      return;
    }
    setCodeError(false);
    setIsProcessing(true);
    try {
      const ok = await repo.completeDeliveryWithCode(order.id, subOrderId, deliveryCodeInput.trim(), currentUser?.id);
      if (ok) {
        showToast('Delivery handover verified successfully!', 'success');
        setSelectedSubOrderId(null);
        setDeliveryCodeInput('');
        onOrderUpdated();
      } else {
        showToast('Delivery code mismatch', 'error');
      }
    } catch {
      showToast('Failed to verify delivery', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyerConfirmReceipt = async (subOrderId: string) => {
    setIsProcessing(true);
    try {
      await repo.confirmBuyerReceipt(order.id, subOrderId);
      showToast('Order confirmed completed! Seller payout queued.', 'success');
      onOrderUpdated();
    } catch {
      showToast('Failed to confirm receipt', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-main)]">Order {order.orderNumber}</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Destination: {formatHallName(order.deliveryHallId)} · Room {order.deliveryRoom}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-xs">
          {/* Buyer 4-Digit Handover Code Card */}
          {isBuyer && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>Your 4-Digit Handover Code</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Give this code to the delivery runner only after inspecting the package.
                </p>
              </div>
              <div className="font-mono text-2xl font-black tracking-widest px-3 py-1 bg-[var(--color-surface)] rounded-lg border border-emerald-500/40 shadow-xs">
                {order.deliveryCode}
              </div>
            </div>
          )}

          {/* Sub-Orders List with Actions */}
          <div className="space-y-4">
            <h3 className="font-bold text-[var(--color-text-main)] uppercase tracking-wider text-[11px]">
              Sub-Orders ({order.subOrders.length} Seller{order.subOrders.length > 1 ? 's' : ''})
            </h3>

            {order.subOrders.map((sub, idx) => {
              const isSellerOfSub = currentUser?.id === sub.sellerId;
              const isAgentOfSub = currentUser?.id === sub.agentId;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                    <span className="font-bold text-[var(--color-text-main)]">Sub-Order #{idx + 1}</span>
                    <span className="capitalize font-mono font-semibold text-[var(--color-brand-primary)]">
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5">
                    {sub.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span>
                          {item.quantity}x {item.title}
                        </span>
                        <span className="font-mono tabular-nums font-semibold">{formatNaira(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[var(--color-border)] flex justify-between text-[11px] text-[var(--color-text-muted)]">
                      <span>Delivery Fee: {formatNaira(sub.deliveryFee)}</span>
                      <span>Subtotal: {formatNaira(sub.subtotal)}</span>
                    </div>
                  </div>

                  {/* Late Penalty Note if applicable */}
                  {sub.penaltyAmount > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
                      <strong>Late Delivery Penalty Applied:</strong> ₦{sub.penaltyAmount.toLocaleString()} deducted from seller payout and credited to buyer.
                    </div>
                  )}

                  {/* Action Triggers based on Role */}
                  <div className="pt-2 flex flex-wrap gap-2 justify-end border-t border-[var(--color-border)]">
                    {/* Seller Actions */}
                    {isSellerOfSub && sub.status === 'payment_confirmed' && (
                      <button
                        onClick={() => handleSellerAccept(sub.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Accept Sub-Order (Start 24h Window)
                      </button>
                    )}

                    {isSellerOfSub && sub.status === 'seller_accepted' && (
                      <button
                        onClick={() => handleAdvanceStatus(sub.id, 'ready', 'Seller marked ready for agent')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Mark Ready for Pickup
                      </button>
                    )}

                    {/* Agent Actions */}
                    {isAgentOfSub && sub.status === 'agent_assigned' && (
                      <button
                        onClick={() => handleAdvanceStatus(sub.id, 'picked_up', 'Agent picked up item from seller')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Confirm Picked Up from Seller
                      </button>
                    )}

                    {isAgentOfSub && sub.status === 'picked_up' && (
                      <button
                        onClick={() => handleAdvanceStatus(sub.id, 'out_for_delivery', 'Agent is en route to destination')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Set Out for Delivery
                      </button>
                    )}

                    {isAgentOfSub && sub.status === 'out_for_delivery' && (
                      <button
                        onClick={() => setSelectedSubOrderId(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Enter Buyer Handover Code</span>
                      </button>
                    )}

                    {/* Buyer Confirmation */}
                    {isBuyer && sub.status === 'delivered' && (
                      <button
                        onClick={() => handleBuyerConfirmReceipt(sub.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90"
                      >
                        Confirm Receipt & Release Escrow
                      </button>
                    )}

                    {/* Buyer Review */}
                    {isBuyer && sub.status === 'completed' && onOpenReviewModal && (
                      <button
                        onClick={() => onOpenReviewModal(sub.items[0]?.listingId, sub.id, order.id, sub.agentId)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface)] flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span>Review Item</span>
                      </button>
                    )}
                  </div>

                  {/* Agent Code Input Modal / Form Inline */}
                  {selectedSubOrderId === sub.id && (
                    <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-brand-primary)] space-y-2 mt-2">
                      <span className="font-semibold text-[var(--color-text-main)]">Enter Buyer Handover Code</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={deliveryCodeInput}
                          onChange={(e) => setDeliveryCodeInput(e.target.value)}
                          placeholder="4-digit code"
                          className="flex-1 bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 font-mono text-center text-sm font-bold tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => handleCompleteDeliveryWithCode(sub.id)}
                          disabled={deliveryCodeInput.length !== 4 || isProcessing}
                          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50"
                        >
                          Verify & Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSubOrderId(null)}
                          className="px-2 py-1.5 text-neutral-400"
                        >
                          Cancel
                        </button>
                      </div>
                      {codeError && <p className="text-[11px] text-red-500">Code does not match buyer's delivery code.</p>}
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="pt-2 border-t border-[var(--color-border)]/60">
                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Event Log
                    </span>
                    <div className="space-y-1">
                      {sub.statusTimeline.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-primary)]" />
                          <span className="capitalize font-medium text-[var(--color-text-main)]">
                            {item.state.replace(/_/g, ' ')}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-[10px]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {item.note && <span className="italic">({item.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment & Total Card */}
          <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
            <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
              Payment & Breakdown
            </span>
            <div className="space-y-1 text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>Payment Mode</span>
                <span className="font-semibold text-[var(--color-text-main)] capitalize">
                  {order.paymentMode.replace(/_/g, ' ')}
                </span>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between">
                  <span>Reference</span>
                  <span className="font-mono font-semibold text-[var(--color-text-main)] select-all">
                    {order.paymentReference}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-mono tabular-nums">{formatNaira(order.itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Total</span>
                <span className="font-mono tabular-nums">{formatNaira(order.deliveryFeeTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--color-border)] font-bold text-sm text-[var(--color-text-main)]">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums text-[var(--color-brand-primary)]">
                  {formatNaira(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
