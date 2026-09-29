/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Building,
  Flag,
  List,
  Lock,
  History,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { repo } from '../../data';
import { Order, UserProfile, Business, Report, AuditLogEntry, Hall, Listing } from '../../types';
import { formatNaira } from '../../utils/money';
import { useNotifications } from '../../context/NotificationContext';

interface AdminDashboardProps {
  onClose: () => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  onRefreshData,
}) => {
  const { currentUser, allUsers, refreshUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<
    'today' | 'payments' | 'sellers' | 'businesses' | 'reports' | 'late' | 'payouts' | 'users' | 'halls' | 'audit'
  >('today');

  const [orders, setOrders] = useState<Order[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [newHallName, setNewHallName] = useState('');
  const [newHallGender, setNewHallGender] = useState<'male' | 'female'>('male');

  const loadData = async () => {
    const [ords, bizs, reps, logs, hls] = await Promise.all([
      repo.getAllOrders(),
      repo.getBusinesses(),
      repo.getReports(),
      repo.getAuditLogs(),
      repo.getHalls(),
    ]);
    setOrders(ords);
    setBusinesses(bizs);
    setReports(reps);
    setAuditLogs(logs);
    setHalls(hls);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Work Queues computation
  const pendingPayments = orders.filter((o) => o.paymentStatus === 'pending_verification');
  const pendingSellers = allUsers.filter((u) => u.sellerApplicationStatus === 'pending');
  const pendingBusinesses = businesses.filter((b) => b.status === 'pending');
  const pendingReports = reports.filter((r) => r.status === 'pending');

  // Late orders: seller took more than agreed hours or 48 hours
  const lateSubOrders = orders.flatMap((o) =>
    o.subOrders
      .filter((s) => s.status !== 'completed' && s.status !== 'cancelled' && (s.penaltyAmount > 0 || (s.sellerAcceptedAt && (Date.now() - new Date(s.sellerAcceptedAt).getTime()) > 48 * 3600 * 1000)))
      .map((s) => ({ order: o, sub: s }))
  );

  // Payouts due: completed sub-orders not yet paid out
  const payoutsDue = orders.flatMap((o) =>
    o.subOrders
      .filter((s) => s.status === 'completed' && !s.sellerPaidOut)
      .map((s) => ({ order: o, sub: s }))
  );

  const handleVerifyPayment = async (orderId: string, approved: boolean) => {
    await repo.verifyPayment(orderId, approved);
    await repo.logAdminAction({
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
      action: approved ? 'VERIFY_PAYMENT_APPROVED' : 'VERIFY_PAYMENT_REJECTED',
      targetType: 'ORDER',
      targetId: orderId,
      details: approved ? 'Payment verified from bank alert match' : 'Transfer reference rejected',
    });
    showToast(approved ? 'Payment confirmed' : 'Payment rejected', 'info');
    await loadData();
    onRefreshData();
  };

  const handleApproveSeller = async (targetUser: UserProfile, approve: boolean) => {
    await repo.updateUserProfile(targetUser.id, {
      isSellerApproved: approve,
      sellerApplicationStatus: approve ? 'approved' : 'rejected',
      badges: approve && !targetUser.badges.includes('Seller') ? [...targetUser.badges, 'Seller'] : targetUser.badges,
    });
    await repo.logAdminAction({
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
      action: approve ? 'SELLER_APPROVED' : 'SELLER_REJECTED',
      targetType: 'USER',
      targetId: targetUser.id,
      details: `Seller application for @${targetUser.username} ${approve ? 'approved' : 'rejected'}`,
    });
    showToast(approve ? 'Seller approved' : 'Seller rejected', 'info');
    await refreshUser();
    await loadData();
    onRefreshData();
  };

  const handleApproveBusiness = async (biz: Business, approve: boolean) => {
    await repo.updateBusiness(biz.id, { status: approve ? 'approved' : 'rejected' });
    await repo.logAdminAction({
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
      action: approve ? 'BUSINESS_APPROVED' : 'BUSINESS_REJECTED',
      targetType: 'BUSINESS',
      targetId: biz.id,
      details: `Campus business ${biz.name} ${approve ? 'approved' : 'rejected'}`,
    });
    showToast(approve ? 'Business approved' : 'Business rejected', 'info');
    await loadData();
    onRefreshData();
  };

  const handleResolveReport = async (repId: string, action: 'resolved' | 'dismissed') => {
    await repo.resolveReport(repId, action);
    await repo.logAdminAction({
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
      action: action === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'REPORT',
      targetId: repId,
      details: `Report marked ${action}`,
    });
    showToast(`Report ${action}`, 'info');
    await loadData();
  };

  const handleMarkPayoutPaid = async (subOrderId: string) => {
    await repo.markSellerPayoutPaid(subOrderId);
    await repo.logAdminAction({
      adminId: currentUser?.id || 'admin',
      adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
      action: 'PAYOUT_DISPATCHED',
      targetType: 'SUB_ORDER',
      targetId: subOrderId,
      details: 'Marked seller bank payout sent',
    });
    showToast('Payout marked as paid', 'success');
    await loadData();
  };

  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHallName.trim()) return;
    const newId = 'hall_' + newHallName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await repo.updateHall({
      id: newId,
      name: newHallName.trim(),
      gender: newHallGender,
      active: true,
    });
    setNewHallName('');
    showToast(`Hall ${newHallName} added`, 'success');
    await loadData();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-main)]">Oja Admin Operations Cockpit</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold">
              {currentUser?.adminLevel?.replace(/_/g, ' ').toUpperCase() || 'SUPER ADMIN'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Tab Navigation */}
        {/* H-01: shrink-0 + inherited line-height keep labels out of the
            divider; snap-x gives phones a scroll affordance for 10 tabs. */}
        <div className="flex shrink-0 overflow-x-auto snap-x scroll-px-4 border-b border-[var(--color-border)] text-xs font-semibold leading-5 px-4 no-scrollbar [&>button]:shrink-0 [&>button]:snap-start">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'today'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Today Cockpit
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'payments'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Payments ({pendingPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'sellers'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Sellers ({pendingSellers.length})
          </button>
          <button
            onClick={() => setActiveTab('businesses')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'businesses'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Businesses ({pendingBusinesses.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'reports'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Reports ({pendingReports.length})
          </button>
          <button
            onClick={() => setActiveTab('late')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'late'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Late Orders ({lateSubOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'payouts'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Payouts ({payoutsDue.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'users'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Users ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('halls')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'halls'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Halls ({halls.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'audit'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)]'
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-xs flex-1">
          {/* 1. TODAY COCKPIT */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setActiveTab('payments')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Payments to Verify</p>
                  <p className="text-2xl font-bold font-mono text-[var(--color-text-main)] mt-1">{pendingPayments.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab('sellers')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Seller Applications</p>
                  <p className="text-2xl font-bold font-mono text-[var(--color-text-main)] mt-1">{pendingSellers.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab('businesses')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Business Approvals</p>
                  <p className="text-2xl font-bold font-mono text-[var(--color-text-main)] mt-1">{pendingBusinesses.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab('reports')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Pending Reports</p>
                  <p className="text-2xl font-bold font-mono text-[var(--color-text-main)] mt-1">{pendingReports.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab('late')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Late Orders Alert</p>
                  <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{lateSubOrders.length}</p>
                </div>

                <div
                  onClick={() => setActiveTab('payouts')}
                  className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">Seller Payouts Due</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{payoutsDue.length}</p>
                </div>
              </div>

              {/* Priority Action Items */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
                <h3 className="font-bold text-[var(--color-text-main)]">Operational Guidelines</h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  Always verify bank transfer references against incoming bank alerts on the official Oja Kuda account before approving orders. Sellers receive payouts only after buyer confirms package delivery with their 4-digit code.
                </p>
              </div>
            </div>
          )}

          {/* 2. PAYMENTS QUEUE */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {pendingPayments.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No pending payments to verify.</p>
              ) : (
                pendingPayments.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[var(--color-text-main)]">{ord.orderNumber}</span>
                        <span className="font-mono font-bold text-[var(--color-brand-primary)]">{formatNaira(ord.totalAmount)}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Sender: <strong className="text-[var(--color-text-main)]">{ord.senderAccountName || 'Unknown'}</strong> · Ref:{' '}
                        <strong className="font-mono text-[var(--color-text-main)] select-all">{ord.paymentReference}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleVerifyPayment(ord.id, true)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Match & Approve</span>
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(ord.id, false)}
                        className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. SELLERS QUEUE */}
          {activeTab === 'sellers' && (
            <div className="space-y-3">
              {pendingSellers.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No pending seller applications.</p>
              ) : (
                pendingSellers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--color-text-main)]">{u.fullName}</span>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">@{u.username}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Bank: <strong>{u.bankDetails?.bankName}</strong> · Acc:{' '}
                        <strong className="font-mono">{u.bankDetails?.accountNumber}</strong> ({u.bankDetails?.accountName})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveSeller(u, true)}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90"
                      >
                        Approve Seller
                      </button>
                      <button
                        onClick={() => handleApproveSeller(u, false)}
                        className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. BUSINESSES QUEUE */}
          {activeTab === 'businesses' && (
            <div className="space-y-3">
              {pendingBusinesses.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No pending business approvals.</p>
              ) : (
                pendingBusinesses.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--color-text-main)]">{b.name}</span>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">@{b.handle}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{b.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveBusiness(b, true)}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveBusiness(b, false)}
                        className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 5. REPORTS QUEUE */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {pendingReports.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No pending reports.</p>
              ) : (
                pendingReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-red-600">{r.reason}</span>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Target: {r.targetType.toUpperCase()} ({r.targetTitle || r.targetId})
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.details && <p className="text-[11px] text-[var(--color-text-main)] italic">"{r.details}"</p>}

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                      <button
                        onClick={() => handleResolveReport(r.id, 'dismissed')}
                        className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)]"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveReport(r.id, 'resolved')}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold"
                      >
                        Resolve & Remove Item
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 6. LATE ORDERS */}
          {activeTab === 'late' && (
            <div className="space-y-3">
              {lateSubOrders.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No late orders currently.</p>
              ) : (
                lateSubOrders.map(({ order, sub }) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-2"
                  >
                    <div className="flex justify-between">
                      <span className="font-mono font-bold">{order.orderNumber}</span>
                      <span className="font-bold text-red-600">Late Penalty: {formatNaira(sub.penaltyAmount)}</span>
                    </div>
                    <p className="text-[11px]">
                      Agreed Delivery Window: {sub.deliveryTimeAgreedHours}h. Late deduction will be credited to buyer as partial refund.
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 7. PAYOUTS QUEUE */}
          {activeTab === 'payouts' && (
            <div className="space-y-3">
              {payoutsDue.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">All seller payouts are up to date.</p>
              ) : (
                payoutsDue.map(({ order, sub }) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{order.orderNumber}</span>
                        <span className="font-mono font-bold text-emerald-600">{formatNaira(sub.sellerPayoutAmount)}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Seller ID: {sub.sellerId} · Handover completed
                      </p>
                    </div>

                    <button
                      onClick={() => handleMarkPayoutPaid(sub.id)}
                      className="px-4 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90"
                    >
                      Mark Payout Paid
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 8. USERS LIST & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {allUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-main)]">{u.fullName}</span>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">@{u.username}</span>
                      {u.badges.map((b) => (
                        <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                          {b}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {u.schoolEmail} · {u.hallId.replace('hall_', '').toUpperCase()} Hall ({u.roomNumber})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        repo.updateUserProfile(u.id, {
                          badges: u.badges.includes('Verified Seller')
                            ? u.badges.filter((b) => b !== 'Verified Seller')
                            : [...u.badges, 'Verified Seller'],
                        }).then(loadData)
                      }
                      className="px-2.5 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                    >
                      {u.badges.includes('Verified Seller') ? 'Remove Verified' : 'Grant Verified'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 9. HALLS MANAGEMENT */}
          {activeTab === 'halls' && (
            <div className="space-y-4">
              <form onSubmit={handleAddHall} className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex gap-2">
                <input
                  type="text"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  placeholder="New Hall Name (e.g. Hebron Hall)"
                  className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5"
                />
                <select
                  value={newHallGender}
                  onChange={(e) => setNewHallGender(e.target.value as any)}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <button type="submit" className="px-4 py-1.5 bg-[var(--color-brand-primary)] text-white rounded-lg font-semibold">
                  Add Hall
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {halls.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-[var(--color-text-main)]">{h.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] capitalize">{h.gender} Hall</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-[var(--color-brand-primary)]">{log.action}</span>
                    <span className="text-[var(--color-text-muted)] ml-2">by {log.adminEmail}</span>
                    <p className="text-[11px] text-[var(--color-text-main)] mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
