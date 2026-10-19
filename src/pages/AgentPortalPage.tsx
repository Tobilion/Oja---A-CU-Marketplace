/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, MessageSquare, Key, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Order, SubOrder, Review } from '../types';
import { AvailableDelivery as BoardDelivery } from '../data/repo';
import { useAuth } from '../context/AuthContext';
import { repo } from '../data';
import { useNotifications } from '../context/NotificationContext';
import { useListQuery } from '../hooks/useListQuery';
import { ListControls } from '../components/common/ListControls';
import { formatNaira } from '../utils/money';
import { formatHallName } from '../utils/formatHall';
import { paths } from '../routes/paths';
import { useSmartBack } from '../routes/useSmartBack';

type AgentTab = 'available' | 'active' | 'done';

interface ActiveRow {
  order: Order;
  sub: SubOrder;
}

const TERMINAL = ['completed', 'cancelled', 'refunded'];

/**
 * 5.2 DELIVERY AGENT PORTAL. Agents see only orders they accepted (RLS/RPC)
 * plus the eligibility-filtered board. No earnings model exists by decision,
 * so the portal shows counts and ratings only.
 */
export const AgentPortalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const handleClose = useSmartBack(paths.home);

  const [tab, setTab] = useState<AgentTab>('available');
  const [board, setBoard] = useState<BoardDelivery[]>([]);
  const [active, setActive] = useState<ActiveRow[]>([]);
  const [done, setDone] = useState<ActiveRow[]>([]);
  const [attention, setAttention] = useState<ActiveRow[]>([]);
  const [agentReviews, setAgentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<string[]>([]);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [available, setAvailable] = useState(() => {
    try {
      return localStorage.getItem(`oja_agent_available_${currentUser?.id}`) !== 'off';
    } catch {
      return true;
    }
  });

  // Guards against a stale load (e.g. a fast persona switch) overwriting the
  // rows of the request that finished last.
  const loadSeq = useRef(0);

  const load = async () => {
    if (!currentUser) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [boardRows, orders, reviews] = await Promise.all([
        repo.getAvailableDeliveries(currentUser.id),
        repo.getOrdersForUser(currentUser.id),
        repo.getReviewsForAgent(currentUser.id),
      ]);
      if (seq !== loadSeq.current) return;
      setBoard(boardRows);
      const mine: ActiveRow[] = [];
      for (const order of orders) {
        for (const sub of order.subOrders) {
          if (sub.agentId === currentUser.id) mine.push({ order, sub });
        }
      }
      setActive(mine.filter((r) => !TERMINAL.includes(r.sub.status) && r.sub.status !== 'disputed' && r.sub.status !== 'cancelled'));
      setAttention(mine.filter((r) => r.sub.status === 'disputed' || r.sub.status === 'cancelled'));
      setDone(mine.filter((r) => r.sub.status === 'completed'));
      setAgentReviews(reviews);
    } catch (e: any) {
      if (seq !== loadSeq.current) return;
      setLoadError(e?.message || 'Failed to load deliveries.');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser]);

  const handleViewOrder = (order: Order) => {
    navigate(paths.order(order.id));
  };

  const handleOpenChatWith = async (userId: string, order: Order) => {
    if (!currentUser) return;
    const thread = await repo.ensureThread(currentUser.id, userId);
    navigate(paths.messageThread(thread.id), { state: { referencedOrder: order } });
  };

  const toggleAvailable = () => {
    const next = !available;
    setAvailable(next);
    try {
      localStorage.setItem(`oja_agent_available_${currentUser?.id}`, next ? 'on' : 'off');
    } catch {}
  };

  const visibleBoard = useMemo(() => board.filter((b) => !deferred.includes(b.subOrderId)), [board, deferred]);

  const boardQuery = useListQuery<BoardDelivery>({
    items: visibleBoard,
    searchText: (b) => `${b.orderNumber} ${b.items.map((i) => i.title).join(' ')}`,
    sortOptions: [
      { id: 'oldest', label: 'Oldest first', compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) },
      { id: 'amount', label: 'Highest value', compare: (a, b) => b.subtotal - a.subtotal },
    ],
    pageSize: 8,
  });

  const activeQuery = useListQuery<ActiveRow>({
    items: active,
    searchText: (r) => `${r.order.orderNumber} ${r.sub.items.map((i) => i.title).join(' ')}`,
    sortOptions: [
      { id: 'newest', label: 'Newest first', compare: (a, b) => +new Date(b.order.createdAt) - +new Date(a.order.createdAt) },
    ],
    pageSize: 8,
  });

  const doneQuery = useListQuery<ActiveRow>({
    items: done,
    searchText: (r) => r.order.orderNumber,
    sortOptions: [
      { id: 'newest', label: 'Newest first', compare: (a, b) => +new Date(b.order.createdAt) - +new Date(a.order.createdAt) },
    ],
    pageSize: 8,
  });

  const handleAccept = async (b: BoardDelivery) => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      await repo.assignDeliveryAgent(b.orderId, b.subOrderId, currentUser.id);
      showToast(`Accepted ${b.orderNumber}. Head to the pickup point.`, 'success');
      await load();
    } catch (err: any) {
      // Atomic claim: a second agent (or double-click) lands here with the
      // loser's message instead of a silent overwrite.
      showToast(err?.message || 'Could not accept this delivery', 'error');
      await load();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdvance = async (row: ActiveRow, next: 'picked_up' | 'out_for_delivery') => {
    setIsProcessing(true);
    try {
      await repo.advanceOrderStatus(row.order.id, row.sub.id, next, undefined, currentUser?.id);
      showToast(next === 'picked_up' ? 'Parcel picked up.' : 'Out for delivery.', 'success');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Status update failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async (row: ActiveRow) => {
    const code = (codeInputs[row.sub.id] || '').trim();
    if (code.length !== 4) {
      setCodeError((prev) => ({ ...prev, [row.sub.id]: true }));
      showToast('Enter the buyer 4-digit code.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const ok = await repo.completeDeliveryWithCode(row.order.id, row.sub.id, code, currentUser?.id);
      if (ok) {
        showToast('Handover verified.', 'success');
        setCodeInputs((prev) => ({ ...prev, [row.sub.id]: '' }));
        await load();
      } else {
        setCodeError((prev) => ({ ...prev, [row.sub.id]: true }));
        showToast('Wrong code. Ask the buyer to read it again.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Handover failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextAction = (row: ActiveRow) => {
    switch (row.sub.status) {
      case 'agent_assigned':
        return (
          <button
            onClick={() => handleAdvance(row, 'picked_up')}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold disabled:opacity-50"
          >
            Mark Picked Up
          </button>
        );
      case 'picked_up':
        return (
          <button
            onClick={() => handleAdvance(row, 'out_for_delivery')}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold disabled:opacity-50"
          >
            Out for Delivery
          </button>
        );
      case 'out_for_delivery':
        return (
          <span className="flex items-center gap-1.5">
            <input
              value={codeInputs[row.sub.id] || ''}
              onChange={(e) => {
                setCodeInputs((prev) => ({ ...prev, [row.sub.id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }));
                setCodeError((prev) => ({ ...prev, [row.sub.id]: false }));
              }}
              placeholder="4-digit code"
              inputMode="numeric"
              aria-label="Buyer delivery code"
              className={`w-24 bg-[var(--color-surface)] border rounded-lg px-2 py-1.5 font-mono text-center ${
                codeError[row.sub.id] ? 'border-red-500' : 'border-[var(--color-border)]'
              }`}
            />
            <button
              onClick={() => handleComplete(row)}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" /> Complete
            </button>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      <div className="relative w-full max-w-4xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Deliveries</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {currentUser?.gender === 'male' ? 'Male halls' : 'Female halls'} only · {active.length} active ·{' '}
              {currentUser?.ratingAverage.toFixed(1)} rating ({currentUser?.ratingCount})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAvailable}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                available
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
            >
              {available ? 'Available' : 'Paused'}
            </button>
            <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600" aria-label="Close deliveries">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {loading ? (
            <p className="text-center py-12 text-[var(--color-text-muted)]">Loading deliveries...</p>
          ) : loadError ? (
            <p className="text-center py-12 text-red-600">{loadError}</p>
          ) : (
            <>
              {attention.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Needs attention ({attention.length})
                  </h3>
                  {attention.map(({ order, sub }) => (
                    <div key={sub.id} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <span className="font-mono font-bold">{order.orderNumber}</span>
                      <p className="text-[11px] mt-0.5">
                        {sub.status === 'disputed'
                          ? 'The buyer opened a dispute. Hold the parcel and wait for a moderator decision.'
                          : 'This order was cancelled while in your hands. Do not deliver; stock returns to the seller.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {(['available', 'active', 'done'] as AgentTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                      tab === t ? 'bg-[var(--color-brand-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {t === 'available' ? `Available (${visibleBoard.length})` : t === 'active' ? `Active (${active.length})` : `Done (${done.length})`}
                  </button>
                ))}
              </div>

              {tab === 'available' && (
                <>
                  {!available ? (
                    <p className="text-center py-12 text-[var(--color-text-muted)]">
                      You are paused. Toggle Available to see pickup requests.
                    </p>
                  ) : (
                    <>
                      <ListControls
                        query={boardQuery.query}
                        onQueryChange={boardQuery.setQuery}
                        searchPlaceholder="Search order number, item..."
                        sortId={boardQuery.sortId}
                        onSortChange={boardQuery.setSortId}
                        sortOptions={boardQuery.sortOptions}
                        page={boardQuery.page}
                        totalPages={boardQuery.totalPages}
                        onPageChange={boardQuery.setPage}
                        total={boardQuery.total}
                        itemLabel="requests"
                      />
                      {boardQuery.pageItems.length === 0 ? (
                        <p className="text-center py-12 text-[var(--color-text-muted)]">
                          {boardQuery.query ? 'No requests match this search.' : 'No pickup requests match your halls right now.'}
                        </p>
                      ) : (
                        boardQuery.pageItems.map((b) => (
                          <div key={b.subOrderId} className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-mono font-bold text-[var(--color-text-main)]">{b.orderNumber}</span>
                              <span className="font-mono font-bold text-[var(--color-brand-primary)]">{formatNaira(b.subtotal)}</span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              Pickup {formatHallName(b.sellerHallId)} → Drop {formatHallName(b.deliveryHallId)} {b.deliveryRoom}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {b.items.map((i) => `${i.quantity}× ${i.title}`).join(' · ')}
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleAccept(b)}
                                disabled={isProcessing}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => {
                                  setDeferred((prev) => [...prev, b.subOrderId]);
                                  showToast('Request deferred for this session.', 'info');
                                }}
                                className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)]"
                              >
                                Defer
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </>
              )}

              {tab === 'active' && (
                <>
                  <ListControls
                    query={activeQuery.query}
                    onQueryChange={activeQuery.setQuery}
                    searchPlaceholder="Search order number, item..."
                    sortId={activeQuery.sortId}
                    onSortChange={activeQuery.setSortId}
                    sortOptions={activeQuery.sortOptions}
                    page={activeQuery.page}
                    totalPages={activeQuery.totalPages}
                    onPageChange={activeQuery.setPage}
                    total={activeQuery.total}
                    itemLabel="deliveries"
                  />
                  {activeQuery.pageItems.length === 0 ? (
                    <p className="text-center py-12 text-[var(--color-text-muted)]">No active deliveries.</p>
                  ) : (
                    activeQuery.pageItems.map((row) => (
                      <div key={row.sub.id} className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[var(--color-text-main)]">{row.order.orderNumber}</span>
                          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] capitalize">
                            {row.sub.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Drop {formatHallName(row.order.deliveryHallId)} {row.order.deliveryRoom} ·{' '}
                          {row.sub.items.map((i) => `${i.quantity}× ${i.title}`).join(' · ')}
                        </p>
                        {row.order.paymentMode === 'pay_on_delivery' && (
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Collect {formatNaira(row.sub.subtotal + row.sub.deliveryFee)} at handover · keep the item until payment verifies
                            {row.order.paymentStatus === 'verified' ? ' (verified)' : ' (not verified yet)'}.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {nextAction(row)}
                          <button
                            onClick={() => handleViewOrder(row.order)}
                            className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)]"
                          >
                            Track
                          </button>
                          <button
                            onClick={() => handleOpenChatWith(row.order.buyerId, row.order)}
                            className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Buyer
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === 'done' && (
                <>
                  <ListControls
                    query={doneQuery.query}
                    onQueryChange={doneQuery.setQuery}
                    searchPlaceholder="Search order number..."
                    sortId={doneQuery.sortId}
                    onSortChange={doneQuery.setSortId}
                    sortOptions={doneQuery.sortOptions}
                    page={doneQuery.page}
                    totalPages={doneQuery.totalPages}
                    onPageChange={doneQuery.setPage}
                    total={doneQuery.total}
                    itemLabel="deliveries"
                  />
                  {doneQuery.pageItems.length === 0 ? (
                    <p className="text-center py-12 text-[var(--color-text-muted)]">No completed deliveries yet.</p>
                  ) : (
                    doneQuery.pageItems.map(({ order, sub }) => (
                      <div key={sub.id} className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold">{order.orderNumber}</span>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {sub.completedAt ? new Date(sub.completedAt).toLocaleDateString() : ''} · {formatNaira(sub.subtotal)}
                          </p>
                        </div>
                        <span className="text-[11px] text-emerald-600 font-semibold">Delivered</span>
                      </div>
                    ))
                  )}
                  {agentReviews.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h3 className="font-bold text-[var(--color-text-main)]">Ratings received ({agentReviews.length})</h3>
                      {agentReviews.slice(0, 5).map((r) => (
                        <div key={r.id} className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                          <span className="text-amber-500 font-semibold">{'★'.repeat(r.agentRating || 0)}</span>
                          {r.agentComment && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{r.agentComment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
