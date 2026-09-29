/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Lock, Truck, Award } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] py-4 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-brand-primary)] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-main)]">Verified Students Only</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">Covenant matric & room identity checked</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-brand-primary)] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-main)]">Oja Protected Escrow</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">Funds held safely until parcel is confirmed</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-brand-primary)] shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-main)]">Vetted Hall Runners</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">Gender-matched delivery directly to your room</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-brand-primary)] shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-main)]">No Counterfeit Tolerance</h4>
              <p className="text-[11px] text-[var(--color-text-muted)]">Strict ban on academic fraud & prohibited items</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
