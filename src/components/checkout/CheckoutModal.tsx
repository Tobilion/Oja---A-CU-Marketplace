/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft, Lock, Building, CreditCard } from 'lucide-react';
import { Hall, PaymentMode, Order } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/money';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';

interface CheckoutModalProps {
  halls: Hall[];
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  halls,
  onClose,
  onOrderSuccess,
}) => {
  const { cart, deliveryMode, setDeliveryMode, itemsSubtotal, feeBreakdownResult, finalTotalAmount, clearCart } = useCart();
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hallId, setHallId] = useState(currentUser?.hallId || halls[0]?.id || 'hall_peter');
  const [roomNumber, setRoomNumber] = useState(currentUser?.roomNumber || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('pay_oja');
  const [unprotectedAck, setUnprotectedAck] = useState(false);

  // Bank transfer reference details
  const [senderAccountName, setSenderAccountName] = useState(currentUser?.fullName || '');
  const [transferReference, setTransferReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeHall = halls.find((h) => h.id === hallId);

  const handleStep1Next = () => {
    if (!roomNumber.trim()) {
      setErrorMsg('Please specify your room number for delivery.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Next = () => {
    if (paymentMode === 'pay_seller_direct' && !unprotectedAck) {
      setErrorMsg('You must acknowledge that paying the seller directly is not protected by Oja.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    // Guard against double-click / double-tap submitting two orders.
    if (!currentUser || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const order = await repo.placeOrder({
        buyerId: currentUser.id,
        deliveryMode,
        deliveryHallId: hallId,
        deliveryRoom: roomNumber.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        paymentMode,
        items: cart.map((i) => ({ listingId: i.listing.id, quantity: i.quantity })),
      });

      // If buyer pays Oja via bank transfer, record payment reference
      if (paymentMode === 'pay_oja' && transferReference.trim()) {
        await repo.submitPaymentDetails(
          order.id,
          transferReference.trim(),
          senderAccountName.trim(),
          finalTotalAmount
        );
      }

      clearCart();
      showToast(`Order ${order.orderNumber} placed successfully!`, 'success');
      onOrderSuccess(order);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Checkout</h2>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[var(--color-text-muted)]">
              <span className={step >= 1 ? 'text-[var(--color-brand-primary)] font-bold' : ''}>1. Destination</span>
              <span>→</span>
              <span className={step >= 2 ? 'text-[var(--color-brand-primary)] font-bold' : ''}>2. Payment</span>
              <span>→</span>
              <span className={step === 3 ? 'text-[var(--color-brand-primary)] font-bold' : ''}>3. Review</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: DESTINATION & MODE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block font-semibold text-[var(--color-text-main)]">Hall of Residence</label>
                <select
                  value={hallId}
                  onChange={(e) => setHallId(e.target.value)}
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-main)]"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.gender} hall)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[var(--color-text-main)]">Room Number</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. C-312"
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[var(--color-text-main)]">Delivery Mode</label>
                  <select
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value as any)}
                    className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                  >
                    <option value="room_delivery">Room Delivery by Agent</option>
                    <option value="pickup">Self-Pickup at Seller Room (₦0)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[var(--color-text-main)]">Delivery Notes (Optional)</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Please deliver after 5pm chapel or leave with room rep"
                  className="w-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white rounded-xl font-semibold flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT METHOD */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-semibold text-[var(--color-text-main)]">Select Payment Mode</label>
                <div className="space-y-2">
                  {/* Mode 1: Pay Oja Escrow (Default) */}
                  <label
                    onClick={() => setPaymentMode('pay_oja')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMode === 'pay_oja'
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 ring-1 ring-[var(--color-brand-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        checked={paymentMode === 'pay_oja'}
                        onChange={() => setPaymentMode('pay_oja')}
                        className="mt-0.5 accent-[var(--color-brand-primary)]"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>Pay Oja (Recommended Escrow Protection)</span>
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Transfer to Oja operations account. Your money is protected and only released to the seller after you confirm delivery with your 4-digit code.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Mode 2: Pay on Delivery or Pickup */}
                  <label
                    onClick={() => setPaymentMode('pay_on_delivery')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMode === 'pay_on_delivery'
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 ring-1 ring-[var(--color-brand-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        checked={paymentMode === 'pay_on_delivery'}
                        onChange={() => setPaymentMode('pay_on_delivery')}
                        className="mt-0.5 accent-[var(--color-brand-primary)]"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-main)]">Pay on Delivery / Pickup</div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Inspect the item physically at your room door or meeting point before making immediate bank transfer to the agent/seller.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Mode 3: Pay Seller Directly */}
                  <label
                    onClick={() => setPaymentMode('pay_seller_direct')}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMode === 'pay_seller_direct'
                        ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        checked={paymentMode === 'pay_seller_direct'}
                        onChange={() => setPaymentMode('pay_seller_direct')}
                        className="mt-0.5 accent-amber-600"
                      />
                      <div>
                        <div className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>Pay Seller Directly (Verified Sellers Only)</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Direct transfer to seller's bank account.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Warning for Direct Pay */}
              {paymentMode === 'pay_seller_direct' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Not Protected by Oja Escrow</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    By choosing this option, Oja does not hold the funds. If the seller fails to deliver or provides a damaged item, Oja cannot refund your transfer.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-xs">
                    <input
                      type="checkbox"
                      checked={unprotectedAck}
                      onChange={(e) => setUnprotectedAck(e.target.checked)}
                      className="accent-amber-600 rounded"
                    />
                    <span>I understand and accept full personal responsibility</span>
                  </label>
                </div>
              )}

              {/* Bank Details for Pay Oja */}
              {paymentMode === 'pay_oja' && (
                <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
                  <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
                    Oja Escrow Bank Account
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Bank Name</p>
                      <p className="font-semibold text-[var(--color-text-main)]">Kuda Microfinance Bank</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Account Number</p>
                      <p className="font-mono font-bold text-[var(--color-text-main)] select-all">2001928374</p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[var(--color-border)]">
                      <p className="text-[10px] text-[var(--color-text-muted)]">Account Name</p>
                      <p className="font-semibold text-[var(--color-text-main)]">Oja Escrow Operations</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[var(--color-text-muted)] font-medium mb-1">
                        Sender's Bank Account Name
                      </label>
                      <input
                        type="text"
                        value={senderAccountName}
                        onChange={(e) => setSenderAccountName(e.target.value)}
                        placeholder="e.g. Samuel Ayomide"
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--color-text-muted)] font-medium mb-1">
                        Bank Transfer Reference / Session ID
                      </label>
                      <input
                        type="text"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        placeholder="e.g. TRF-1029384756 or paste transaction reference"
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs font-mono"
                      />
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        Payment Verifiers match this against bank alerts. No image upload required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white rounded-xl font-semibold flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PLACE ORDER */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2 text-xs">
                <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
                  Summary
                </span>
                <div className="space-y-1 text-[var(--color-text-muted)]">
                  <div className="flex justify-between">
                    <span>Destination</span>
                    <span className="font-semibold text-[var(--color-text-main)]">
                      {activeHall?.name} · Room {roomNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Mode</span>
                    <span className="font-semibold text-[var(--color-text-main)]">
                      {deliveryMode === 'room_delivery' ? 'Room Delivery' : 'Pickup (₦0)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Mode</span>
                    <span className="font-semibold text-[var(--color-text-main)]">
                      {paymentMode === 'pay_oja'
                        ? 'Pay Oja Escrow'
                        : paymentMode === 'pay_on_delivery'
                        ? 'Pay on Delivery'
                        : 'Pay Seller Directly'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                <span className="font-semibold text-[var(--color-text-main)] uppercase tracking-wider text-[10px]">
                  Items in Order ({cart.reduce((s, i) => s + i.quantity, 0)})
                </span>
                <div className="space-y-2 pt-1">
                  {cart.map((item) => (
                    <div key={item.listing.id} className="flex justify-between items-center text-xs">
                      <span className="truncate max-w-[240px]">
                        {item.quantity}x {item.listing.title}
                      </span>
                      <span className="font-mono tabular-nums font-semibold">
                        {formatNaira(item.listing.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[var(--color-border)] flex justify-between font-semibold text-xs">
                    <span>Delivery Fee Total</span>
                    <span className="font-mono tabular-nums">{formatNaira(feeBreakdownResult.finalTotalDeliveryFee)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[var(--color-border)] text-sm font-bold text-[var(--color-text-main)]">
                    <span>Total Amount</span>
                    <span className="font-mono tabular-nums text-[var(--color-brand-primary)]">
                      {formatNaira(finalTotalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[var(--color-brand-primary)] text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Placing Order...' : `Place Order · ${formatNaira(finalTotalAmount)}`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
