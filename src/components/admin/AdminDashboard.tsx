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
import { Order, SubOrder, UserProfile, Business, Report, AuditLogEntry, Hall, Listing, UserBadge } from '../../types';
import { AdminUserUpdates } from '../../data';
import { useListQuery } from '../../hooks/useListQuery';
import { ListControls } from '../common/ListControls';
import { useModalEscape } from '../../hooks/useModalEscape';
import { formatNaira } from '../../utils/money';
import { formatHallName } from '../../utils/formatHall';
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
  const modalRef = useModalEscape(true, onClose);

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

  // H-02/H-03: shared search, sort, and pagination over the user directory.
  const userQuery = useListQuery<UserProfile>({
    items: allUsers,
    searchText: (u) =>
      `${u.fullName} ${u.username} ${u.schoolEmail} ${u.personalEmail} ${(u.badges || []).join(' ')} ${u.adminLevel || ''}`,
    sortOptions: [
      { id: 'name', label: 'Name A-Z', compare: (a, b) => a.fullName.localeCompare(b.fullName) },
      {
        id: 'newest',
        label: 'Newest first',
        compare: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      },
      {
        id: 'suspended',
        label: 'Suspended first',
        compare: (a, b) => Number(b.isSuspended) - Number(a.isSuspended),
      },
    ],
    pageSize: 8,
  });

  const ALL_BADGES: UserBadge[] = ['Member', 'Seller', 'Verified Seller', 'Business Owner', 'Delivery Agent', 'Admin'];

  // H-03: every privileged user change flows through adminUpdateUser (guards
  // + audit) instead of the self-profile path, which strips privileged fields.
  const handleAdminUserUpdate = async (targetId: string, updates: AdminUserUpdates) => {
    if (!currentUser) return;
    try {
      await repo.adminUpdateUser(currentUser.id, targetId, updates);
      await refreshUser();
      await loadData();
      showToast('User updated. Audit entry recorded.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'User update failed', 'error');
    }
  };

  const handleAdminLevelChange = async (u: UserProfile, level: string) => {
    const adminLevel = (level === 'none' ? null : level) as UserProfile['adminLevel'];
    const badges: UserBadge[] = adminLevel
      ? u.badges.includes('Admin')
        ? u.badges
        : [...u.badges, 'Admin' as UserBadge]
      : u.badges.filter((b) => b !== 'Admin');
    await handleAdminUserUpdate(u.id, { adminLevel, badges });
  };

  // Work Queues computation (declared before the H-02 queries that read them)
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

  // H-02: every queue below shares the same search, sort, and pagination.
  const byOldest = (a: { createdAt: string }, b: { createdAt: string }) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const byName = (a: { fullName: string }, b: { fullName: string }) => a.fullName.localeCompare(b.fullName);

  const paymentQuery = useListQuery<Order>({
    items: pendingPayments,
    searchText: (o) => `${o.orderNumber} ${o.senderAccountName || ''} ${o.paymentReference || ''} ${o.totalAmount}`,
    sortOptions: [
      { id: 'oldest', label: 'Oldest first', compare: byOldest },
      { id: 'newest', label: 'Newest first', compare: byNewest },
      { id: 'highest', label: 'Highest amount', compare: (a, b) => b.totalAmount - a.totalAmount },
    ],
    pageSize: 8,
  });

  const sellerQuery = useListQuery<UserProfile>({
    items: pendingSellers,
    searchText: (u) => `${u.fullName} ${u.username} ${u.schoolEmail} ${u.bankDetails?.bankName || ''} ${u.bankDetails?.accountNumber || ''}`,
    sortOptions: [
      { id: 'oldest', label: 'Oldest application', compare: (a, b) => byOldest({ createdAt: a.sellerApplicationDate || a.createdAt }, { createdAt: b.sellerApplicationDate || b.createdAt }) },
      { id: 'name', label: 'Name A-Z', compare: byName },
    ],
    pageSize: 8,
  });

  const businessQuery = useListQuery<Business>({
    items: pendingBusinesses,
    searchText: (b) => `${b.name} ${b.handle} ${b.description}`,
    sortOptions: [
      { id: 'oldest', label: 'Oldest first', compare: byOldest },
      { id: 'name', label: 'Name A-Z', compare: (a, b) => a.name.localeCompare(b.name) },
    ],
    pageSize: 8,
  });

  const reportQuery = useListQuery<Report>({
    items: pendingReports,
    searchText: (r) => `${r.reason} ${r.targetType} ${r.targetTitle || ''} ${r.details || ''}`,
    sortOptions: [
      { id: 'oldest', label: 'Oldest first', compare: byOldest },
      { id: 'newest', label: 'Newest first', compare: byNewest },
    ],
    pageSize: 8,
  });

  const lateQuery = useListQuery<{ order: Order; sub: SubOrder }>({
    items: lateSubOrders,
    searchText: ({ order }) => order.orderNumber,
    sortOptions: [
      { id: 'penalty', label: 'Highest penalty', compare: (a, b) => b.sub.penaltyAmount - a.sub.penaltyAmount },
      { id: 'oldest', label: 'Oldest order', compare: (a, b) => byOldest(a.order, b.order) },
    ],
    pageSize: 8,
  });

  const payoutQuery = useListQuery<{ order: Order; sub: SubOrder }>({
    items: payoutsDue,
    searchText: ({ order, sub }) => `${order.orderNumber} ${sub.sellerId} ${sub.sellerPayoutAmount}`,
    sortOptions: [
      { id: 'highest', label: 'Highest payout', compare: (a, b) => b.sub.sellerPayoutAmount - a.sub.sellerPayoutAmount },
      { id: 'oldest', label: 'Oldest order', compare: (a, b) => byOldest(a.order, b.order) },
    ],
    pageSize: 8,
  });

  const hallQuery = useListQuery<Hall>({
    items: halls,
    searchText: (h) => `${h.name} ${h.gender}`,
    sortOptions: [{ id: 'name', label: 'Name A-Z', compare: (a, b) => a.name.localeCompare(b.name) }],
    pageSize: 12,
  });

  const auditQuery = useListQuery<AuditLogEntry>({
    items: auditLogs,
    searchText: (l) => `${l.action} ${l.adminEmail} ${l.targetType} ${l.targetId} ${l.details || ''}`,
    sortOptions: [
      { id: 'newest', label: 'Newest first', compare: (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() },
      { id: 'oldest', label: 'Oldest first', compare: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() },
    ],
    pageSize: 10,
  });

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
    // B-04 allowlist strips privileged fields from updateUserProfile, so
    // seller approval must flow through the privileged admin path.
    if (!currentUser) return;
    try {
      await repo.adminUpdateUser(currentUser.id, targetUser.id, {
        isSellerApproved: approve,
        sellerApplicationStatus: approve ? 'approved' : 'rejected',
        badges: approve && !targetUser.badges.includes('Seller') ? [...targetUser.badges, 'Seller'] : targetUser.badges,
      });
    } catch (err: any) {
      showToast(err?.message || 'Seller approval failed', 'error');
      return;
    }
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

  const pendingTransfers = businesses.filter((b) => b.transferRequest?.status === 'pending');

  const handleTransferDecision = async (biz: Business, approved: boolean) => {
    if (approved && !confirm(`Transfer ownership of ${biz.name} to the nominated student?`)) return;
    try {
      await repo.approveBusinessOwnershipTransfer(biz.id, approved);
      await repo.logAdminAction({
        adminId: currentUser?.id || 'admin',
        adminEmail: currentUser?.personalEmail || 'admin@oja.cu',
        action: approved ? 'BUSINESS_TRANSFER_APPROVED' : 'BUSINESS_TRANSFER_REJECTED',
        targetType: 'BUSINESS',
        targetId: biz.id,
        details: `Ownership transfer for ${biz.name} ${approved ? 'approved' : 'rejected'}`,
      });
      showToast(approved ? 'Ownership transferred.' : 'Transfer rejected.', 'info');
      await loadData();
      onRefreshData();
    } catch (err: any) {
      showToast(err?.message || 'Transfer decision failed', 'error');
    }
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
    <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
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
              <ListControls
                query={paymentQuery.query}
                onQueryChange={paymentQuery.setQuery}
                searchPlaceholder="Search order number, sender, reference..."
                sortId={paymentQuery.sortId}
                onSortChange={paymentQuery.setSortId}
                sortOptions={paymentQuery.sortOptions}
                page={paymentQuery.page}
                totalPages={paymentQuery.totalPages}
                onPageChange={paymentQuery.setPage}
                total={paymentQuery.total}
                itemLabel="payments"
              />
              {paymentQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {paymentQuery.query ? 'No payments match this search.' : 'No pending payments to verify.'}
                </p>
              ) : (
                paymentQuery.pageItems.map((ord) => (
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
              <ListControls
                query={sellerQuery.query}
                onQueryChange={sellerQuery.setQuery}
                searchPlaceholder="Search name, email, bank..."
                sortId={sellerQuery.sortId}
                onSortChange={sellerQuery.setSortId}
                sortOptions={sellerQuery.sortOptions}
                page={sellerQuery.page}
                totalPages={sellerQuery.totalPages}
                onPageChange={sellerQuery.setPage}
                total={sellerQuery.total}
                itemLabel="applications"
              />
              {sellerQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {sellerQuery.query ? 'No applications match this search.' : 'No pending seller applications.'}
                </p>
              ) : (
                sellerQuery.pageItems.map((u) => (
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
              {pendingTransfers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--color-text-main)]">
                    Ownership Transfers ({pendingTransfers.length})
                  </h3>
                  {pendingTransfers.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-sm text-[var(--color-text-main)]">{b.name}</span>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Nominated owner ID: <span className="font-mono">{b.transferRequest?.newOwnerId}</span> ·
                          Requested {b.transferRequest ? new Date(b.transferRequest.requestedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTransferDecision(b, true)}
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand-primary)] text-white font-semibold"
                        >
                          Approve Transfer
                        </button>
                        <button
                          onClick={() => handleTransferDecision(b, false)}
                          className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <ListControls
                query={businessQuery.query}
                onQueryChange={businessQuery.setQuery}
                searchPlaceholder="Search business name, handle..."
                sortId={businessQuery.sortId}
                onSortChange={businessQuery.setSortId}
                sortOptions={businessQuery.sortOptions}
                page={businessQuery.page}
                totalPages={businessQuery.totalPages}
                onPageChange={businessQuery.setPage}
                total={businessQuery.total}
                itemLabel="businesses"
              />
              {businessQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {businessQuery.query ? 'No businesses match this search.' : 'No pending business approvals.'}
                </p>
              ) : (
                businessQuery.pageItems.map((b) => (
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
              <ListControls
                query={reportQuery.query}
                onQueryChange={reportQuery.setQuery}
                searchPlaceholder="Search reason, target..."
                sortId={reportQuery.sortId}
                onSortChange={reportQuery.setSortId}
                sortOptions={reportQuery.sortOptions}
                page={reportQuery.page}
                totalPages={reportQuery.totalPages}
                onPageChange={reportQuery.setPage}
                total={reportQuery.total}
                itemLabel="reports"
              />
              {reportQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {reportQuery.query ? 'No reports match this search.' : 'No pending reports.'}
                </p>
              ) : (
                reportQuery.pageItems.map((r) => (
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
              <ListControls
                query={lateQuery.query}
                onQueryChange={lateQuery.setQuery}
                searchPlaceholder="Search order number..."
                sortId={lateQuery.sortId}
                onSortChange={lateQuery.setSortId}
                sortOptions={lateQuery.sortOptions}
                page={lateQuery.page}
                totalPages={lateQuery.totalPages}
                onPageChange={lateQuery.setPage}
                total={lateQuery.total}
                itemLabel="late orders"
              />
              {lateQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {lateQuery.query ? 'No late orders match this search.' : 'No late orders currently.'}
                </p>
              ) : (
                lateQuery.pageItems.map(({ order, sub }) => (
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
              <ListControls
                query={payoutQuery.query}
                onQueryChange={payoutQuery.setQuery}
                searchPlaceholder="Search order number, seller..."
                sortId={payoutQuery.sortId}
                onSortChange={payoutQuery.setSortId}
                sortOptions={payoutQuery.sortOptions}
                page={payoutQuery.page}
                totalPages={payoutQuery.totalPages}
                onPageChange={payoutQuery.setPage}
                total={payoutQuery.total}
                itemLabel="payouts"
              />
              {payoutQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {payoutQuery.query ? 'No payouts match this search.' : 'All seller payouts are up to date.'}
                </p>
              ) : (
                payoutQuery.pageItems.map(({ order, sub }) => (
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
              <ListControls
                query={userQuery.query}
                onQueryChange={userQuery.setQuery}
                searchPlaceholder="Search name, username, email, badge..."
                sortId={userQuery.sortId}
                onSortChange={userQuery.setSortId}
                sortOptions={userQuery.sortOptions}
                page={userQuery.page}
                totalPages={userQuery.totalPages}
                onPageChange={userQuery.setPage}
                total={userQuery.total}
                itemLabel="users"
              />
              {userQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">No users match this search.</p>
              ) : (
                userQuery.pageItems.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[var(--color-text-main)]">{u.fullName}</span>
                            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">@{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-semibold">
                                You
                              </span>
                            )}
                            {u.isSuspended && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
                                Suspended
                              </span>
                            )}
                            {u.adminLevel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold">
                                {u.adminLevel.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            {u.schoolEmail} · {formatHallName(u.hallId)} ({u.roomNumber})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[11px] text-[var(--color-text-muted)]">
                            Level{' '}
                            <select
                              value={u.adminLevel || 'none'}
                              disabled={isSelf}
                              onChange={(e) => handleAdminLevelChange(u, e.target.value)}
                              className="ml-1 px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-main)] disabled:opacity-40"
                            >
                              <option value="none">None</option>
                              <option value="moderator">Moderator</option>
                              <option value="payment_verifier">Payment verifier</option>
                              <option value="logistics_admin">Logistics admin</option>
                              <option value="super_admin">Super admin</option>
                            </select>
                          </label>
                          <button
                            disabled={isSelf}
                            onClick={() => {
                              if (!u.isSuspended && !confirm(`Suspend ${u.fullName}? They lose buying and selling access until unsuspended.`)) return;
                              handleAdminUserUpdate(u.id, { isSuspended: !u.isSuspended });
                            }}
                            className="px-2.5 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)] disabled:opacity-40"
                          >
                            {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {ALL_BADGES.map((b) => {
                          const has = u.badges.includes(b);
                          return (
                            <button
                              key={b}
                              disabled={isSelf}
                              onClick={() =>
                                handleAdminUserUpdate(u.id, {
                                  badges: has ? u.badges.filter((x) => x !== b) : [...u.badges, b],
                                })
                              }
                              title={has ? `Revoke ${b}` : `Grant ${b}`}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors disabled:opacity-40 ${
                                has
                                  ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/30 font-semibold'
                                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-main)]'
                              }`}
                            >
                              {has ? `✓ ${b}` : `+ ${b}`}
                            </button>
                          );
                        })}
                        {u.sellerApplicationStatus === 'pending' && (
                          <button
                            onClick={() => handleAdminUserUpdate(u.id, { isSellerApproved: true, sellerApplicationStatus: 'approved' })}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold"
                          >
                            Approve seller application
                          </button>
                        )}
                      </div>
                      {isSelf && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Self-actions are disabled: you cannot change your own role, badges, or suspension.
                        </p>
                      )}
                    </div>
                  );
                })
              )}
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

              <ListControls
                query={hallQuery.query}
                onQueryChange={hallQuery.setQuery}
                searchPlaceholder="Search halls..."
                sortId={hallQuery.sortId}
                onSortChange={hallQuery.setSortId}
                sortOptions={hallQuery.sortOptions}
                page={hallQuery.page}
                totalPages={hallQuery.totalPages}
                onPageChange={hallQuery.setPage}
                total={hallQuery.total}
                itemLabel="halls"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {hallQuery.pageItems.map((h) => (
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
              <ListControls
                query={auditQuery.query}
                onQueryChange={auditQuery.setQuery}
                searchPlaceholder="Search action, admin, target..."
                sortId={auditQuery.sortId}
                onSortChange={auditQuery.setSortId}
                sortOptions={auditQuery.sortOptions}
                page={auditQuery.page}
                totalPages={auditQuery.totalPages}
                onPageChange={auditQuery.setPage}
                total={auditQuery.total}
                itemLabel="entries"
              />
              {auditQuery.pageItems.length === 0 ? (
                <p className="text-center py-12 text-[var(--color-text-muted)]">
                  {auditQuery.query ? 'No audit entries match this search.' : 'No admin actions recorded yet.'}
                </p>
              ) : (
                auditQuery.pageItems.map((log) => (
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
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
