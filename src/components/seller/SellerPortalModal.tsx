/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle2, XCircle, Truck, MessageSquare, Wallet } from 'lucide-react';
import { Order, SubOrder, Business, BankDetails } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { useNotifications } from '../../context/NotificationContext';
import { useModalEscape } from '../../hooks/useModalEscape';
import { useListQuery } from '../../hooks/useListQuery';
import { ListControls } from '../common/ListControls';
import { formatNaira } from '../../utils/money';
import { formatHallName } from '../../utils/formatHall';

interface SellerPortalModalProps {
  businesses: Business[];
  onClose: () => void;
  onViewOrder: (order: Order) => void;
  onOpenChatWith: (userId: string, order?: Order) => void;
  onOpenCreateListing: () => void;
  onOpenRecycleBin: () => void;
}

type SellerTab = 'new' | 'progress' | 'done' | 'cancelled' | 'payouts';

interface SellerRow {
  order: Order;
  sub: SubOrder;
}

const NEW_STATES = ['payment_confirmed'];
const PROGRESS_STATES = ['seller_accepted', 'ready', 'agent_assigned', 'picked_up', 'out_for_delivery', 'delivered'];
const DONE_STATES = ['completed'];
const CANCELLED_STATES = ['cancelled', 'refunded', 'disputed'];

/**
 * 5.1 SELLER PORTAL ("My store" as a real dashboard). A seller only ever sees
 * their own sub-orders (RLS/RPC server-side; filtered here for display), with
 * the buyer's name, hall, and delivery method but never private buyer fields.
 */
export const SellerPortalModal: React.FC<SellerPortalModalProps> = ({
  businesses,
  onClose,
  onViewOrder,
  onOpenChatWith,
  onOpenCreateListing,
  onOpenRecycleBin,
}) => {
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useNotifications();
  const modalRef = useModalEscape(true, onClose);

  const [rows, setRows] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<SellerTab>('new');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [agreedHours, setAgreedHours] = useState('24');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState<BankDetails>({ bankName: '', accountNumber: '', accountName: '' });

  const myBusinesses = useMemo(
    () => businesses.filter((b) => b.ownerId === currentUser?.id || b.memberIds.includes(currentUser?.id || '')),
    [businesses, currentUser]
  );

  const load = async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [orders, listings] = await Promise.all([
        repo.getOrdersForUser(currentUser.id),
        repo.getListings(false),
      ]);
      const mine: SellerRow[] = [];
      for (const order of orders) {
        for (const sub of order.subOrders) {
          if (sub.sellerId === currentUser.id) mine.push({ order, sub });
        }
      }
      setRows(mine);
      setLowStockCount(
        listings.filter((l) => l.sellerId === currentUser.id && l.status === 'active' && l.stock <= 3).length
      );
      setBankForm(
        currentUser.bankDetails || { bankName: '', accountNumber: '', accountName: currentUser.fullName }
      );
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load your store.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser]);

  const filtered = useMemo(() => {
    const states =
      tab === 'new' ? NEW_STATES : tab === 'progress' ? PROGRESS_STATES : tab === 'done' ? DONE_STATES : CANCELLED_STATES;
    return rows.filter(
      (r) =>
        states.includes(r.sub.status) &&
        (storeFilter === 'all' ||
          (storeFilter === 'personal' && !r.sub.businessId) ||
          r.sub.businessId === storeFilter)
    );
  }, [rows, tab, storeFilter]);

  const query = useListQuery<SellerRow>({
    items: filtered,
    searchText: (r) => `${r.order.orderNumber} ${r.sub.items.map((i) => i.title).join(' ')}`,
    sortOptions: [
      { id: 'newest', label: 'Newest first', compare: (a, b) => +new Date(b.order.createdAt) - +new Date(a.order.createdAt) },
      { id: 'amount', label: 'Highest value', compare: (a, b) => b.sub.subtotal - a.sub.subtotal },
    ],
    pageSize: 8,
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 3600 * 1000;
    const month = 30 * 24 * 3600 * 1000;
    let weekSales = 0;
    let monthSales = 0;
    let pending = 0;
    let paid = 0;
    for (const { sub } of rows) {
      if (sub.status === 'completed' && sub.completedAt) {
        const age = now - new Date(sub.completedAt).getTime();
        if (age < week) weekSales += sub.subtotal;
        if (age < month) monthSales += sub.subtotal;
      }
      if (sub.status === 'completed' && !sub.sellerPaidOut) pending += sub.sellerPayoutAmount;
      if (sub.sellerPaidOut) paid += sub.sellerPayoutAmount;
    }
    return { weekSales, monthSales, pending, paid, needAction: rows.filter((r) => NEW_STATES.includes(r.sub.status)).length };
  }, [rows]);

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setIsProcessing(true);
    try {
      await fn();
      showToast(success, 'success');
      setRespondingTo(null);
      setRejectReason('');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = (row: SellerRow) =>
    runAction(
      () => repo.sellerAcceptSubOrder(row.order.id, row.sub.id, parseInt(agreedHours, 10) || 24, currentUser?.id),
      'Sub-order accepted. Delivery clock started.'
    );

  const handleReject = (row: SellerRow) => {
    if (!rejectReason.trim()) {
      showToast('Give a short reason so the buyer understands.', 'error');
      return;
    }
    runAction(
      () => repo.rejectSubOrder(row.order.id, row.sub.id, rejectReason.trim(), currentUser?.id),
      'Sub-order rejected. Stock returned.'
    );
  };

  const handleMarkReady = (row: SellerRow) =>
    runAction(
      () => repo.advanceOrderStatus(row.order.id, row.sub.id, 'ready', 'Items packed, ready for pickup', currentUser?.id),
      'Marked ready for pickup.'
    );

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (bankForm.accountNumber.trim().length !== 10) {
      showToast('Nigerian bank account numbers must be exactly 10 digits.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await repo.updateUserProfile(currentUser.id, { bankDetails: { ...bankForm, accountNumber: bankForm.accountNumber.trim() } });
      setEditingBank(false);
      showToast('Bank details saved.', 'success');
      await refreshUser();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save bank details', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const buyerLabel = (row: SellerRow) => {
    const hall = formatHallName(row.order.deliveryHallId, undefined, 'short');
    return `${row.order.deliveryMode === 'pickup' ? 'Pickup' : `Room delivery · ${hall} ${row.order.deliveryRoom}`}`;
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-main)]">My Store</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {currentUser?.ratingAverage.toFixed(1)} rating · {rows.length} sub-orders
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600" aria-label="Close store">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 text-xs flex-1">
          {loading ? (
            <p className="text-center py-12 text-[var(--color-text-muted)]">Loading your store...</p>
          ) : loadError ? (
            <p className="text-center py-12 text-red-600">{loadError}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Sales · 7 days', value: formatNaira(stats.weekSales) },
                  { label: 'Sales · 30 days', value: formatNaira(stats.monthSales) },
                  { label: 'Need action', value: String(stats.needAction) },
                  { label: 'Low stock items', value: String(lowStockCount) },
                  { label: 'Pending payout', value: formatNaira(stats.pending) },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">{s.label}</p>
                    <p className="text-base font-bold font-mono text-[var(--color-text-main)] mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['new', 'progress', 'done', 'cancelled', 'payouts'] as SellerTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                      tab === t
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {t === 'new' ? `New orders (${stats.needAction})` : t}
                  </button>
                ))}
                {myBusinesses.length > 0 && (
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    aria-label="Store filter"
                    className="ml-auto px-2 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs"
                  >
                    <option value="all">All stores</option>
                    <option value="personal">Personal</option>
                    {myBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {tab === 'payouts' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" /> Owed {formatNaira(stats.pending)} · Paid out {formatNaira(stats.paid)}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {currentUser?.bankDetails
                          ? `${currentUser.bankDetails.bankName} · ${currentUser.bankDetails.accountNumber} · ${currentUser.bankDetails.accountName}`
                          : 'No bank details on file. Add them so payouts can reach you.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingBank((v) => !v)}
                      className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] font-semibold shrink-0"
                    >
                      {editingBank ? 'Cancel' : currentUser?.bankDetails ? 'Edit Bank' : 'Add Bank'}
                    </button>
                  </div>
                  {editingBank && (
                    <form onSubmit={handleSaveBank} className="p-4 rounded-xl border border-[var(--color-border)] grid sm:grid-cols-3 gap-2">
                      <input
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        placeholder="Bank name"
                        required
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5"
                      />
                      <input
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="10-digit account number"
                        required
                        inputMode="numeric"
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 font-mono"
                      />
                      <input
                        value={bankForm.accountName}
                        onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                        placeholder="Account name"
                        required
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5"
                      />
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="sm:col-span-3 px-4 py-2 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold disabled:opacity-50"
                      >
                        Save Bank Details
                      </button>
                    </form>
                  )}
                  {rows
                    .filter((r) => r.sub.status === 'completed')
                    .map(({ order, sub }) => (
                      <div key={sub.id} className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold">{order.orderNumber}</span>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            Subtotal {formatNaira(sub.subtotal)}
                            {sub.penaltyAmount > 0 && ` · Late penalty -${formatNaira(sub.penaltyAmount)}`} ·{' '}
                            Payout {formatNaira(sub.sellerPayoutAmount)}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold ${sub.sellerPaidOut ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sub.sellerPaidOut ? 'Paid' : 'Queued'}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <>
                  <ListControls
                    query={query.query}
                    onQueryChange={query.setQuery}
                    searchPlaceholder="Search order number, item..."
                    sortId={query.sortId}
                    onSortChange={query.setSortId}
                    sortOptions={query.sortOptions}
                    page={query.page}
                    totalPages={query.totalPages}
                    onPageChange={query.setPage}
                    total={query.total}
                    itemLabel="sub-orders"
                  />
                  {query.pageItems.length === 0 ? (
                    <p className="text-center py-12 text-[var(--color-text-muted)]">
                      {query.query ? 'No sub-orders match this search.' : 'Nothing here yet.'}
                    </p>
                  ) : (
                    query.pageItems.map(({ order, sub }) => (
                      <div key={sub.id} className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-mono font-bold text-[var(--color-text-main)]">{order.orderNumber}</span>
                            <span className="ml-2 font-mono font-bold text-[var(--color-brand-primary)]">{formatNaira(sub.subtotal)}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] capitalize">
                            {sub.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {sub.items.map((i) => `${i.quantity}× ${i.title}`).join(' · ')}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{buyerLabel({ order, sub })}</p>

                        {tab === 'new' && (
                          <div className="pt-1">
                            {respondingTo === sub.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5">
                                    Hours to deliver
                                    <input
                                      type="number"
                                      min={1}
                                      value={agreedHours}
                                      onChange={(e) => setAgreedHours(e.target.value)}
                                      className="w-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 font-mono"
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleAccept({ order, sub })}
                                    disabled={isProcessing}
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Rejection reason (shown to buyer)"
                                    className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5"
                                  />
                                  <button
                                    onClick={() => handleReject({ order, sub })}
                                    disabled={isProcessing}
                                    className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setRespondingTo(sub.id);
                                  setAgreedHours('24');
                                  setRejectReason('');
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold"
                              >
                                Accept or Reject
                              </button>
                            )}
                          </div>
                        )}

                        {tab === 'progress' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.status === 'seller_accepted' && (
                              <button
                                onClick={() => handleMarkReady({ order, sub })}
                                disabled={isProcessing}
                                className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold flex items-center gap-1 disabled:opacity-50"
                              >
                                <Truck className="w-3.5 h-3.5" /> Mark Ready
                              </button>
                            )}
                            <button
                              onClick={() => onViewOrder(order)}
                              className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)]"
                            >
                              Track
                            </button>
                            <button
                              onClick={() => onOpenChatWith(order.buyerId, order)}
                              className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Message Buyer
                            </button>
                          </div>
                        )}

                        {(tab === 'done' || tab === 'cancelled') && (
                          <button
                            onClick={() => onViewOrder(order)}
                            className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)]"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={onOpenCreateListing} className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] font-semibold">
                  + New Listing
                </button>
                <button onClick={onOpenRecycleBin} className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)]">
                  Recycle Bin
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
