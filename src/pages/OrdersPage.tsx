/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Order } from '../types';
import { formatNaira } from '../utils/money';
import { formatHallName } from '../utils/formatHall';
import { useAuth } from '../context/AuthContext';
import { repo } from '../data';
import { RouteFallback } from '../components/common/RouteFallback';
import { paths } from '../routes/paths';

/**
 * Full-page replacement for the orders tabs that used to live in the cart
 * drawer: ongoing orders track progress, delivered orders open their receipt.
 */
export const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) return;
    repo
      .getOrdersForUser(currentUser.id)
      .then((list) => {
        if (cancelled) return;
        setOrders(list);
        setLoadState('ready');
      })
      .catch((e) => {
        console.error('Failed to load orders', e);
        if (!cancelled) setLoadState('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  if (loadState === 'loading') {
    return <RouteFallback />;
  }

  const ongoingOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const deliveredOrders = orders.filter((o) => o.status === 'completed' || o.status === 'delivered');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[var(--color-text-main)]">Your Orders</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Track deliveries, hand over codes, and revisit completed purchases.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 text-center">
          <div className="p-4 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-main)]">No orders yet</p>
          <p className="text-xs text-[var(--color-text-muted)]">Browse campus listings to place your first order.</p>
          <Link
            to={paths.home}
            className="mt-1 px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-bold text-[var(--color-text-main)] uppercase tracking-wider text-[11px]">
              Ongoing ({ongoingOrders.length})
            </h2>
            {ongoingOrders.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">No ongoing orders.</p>
            ) : (
              ongoingOrders.map((ord) => (
                <Link
                  key={ord.id}
                  to={paths.order(ord.id)}
                  className="block p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[var(--color-text-main)]">{ord.orderNumber}</span>
                    <span className="capitalize font-semibold text-[var(--color-brand-gold)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[var(--color-text-muted)]">
                    <span>
                      {ord.subOrders.length} sub-order(s) · {formatHallName(ord.deliveryHallId)}
                    </span>
                    <span className="font-mono font-bold text-[var(--color-text-main)]">{formatNaira(ord.totalAmount)}</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-brand-primary)] flex items-center gap-1 pt-1 font-medium">
                    <span>Track timeline & delivery code</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-bold text-[var(--color-text-main)] uppercase tracking-wider text-[11px]">
              Delivered ({deliveredOrders.length})
            </h2>
            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">No delivered orders yet.</p>
            ) : (
              deliveredOrders.map((ord) => (
                <Link
                  key={ord.id}
                  to={paths.order(ord.id)}
                  className="block p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)] transition-colors space-y-2 text-xs"
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
                </Link>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
};
