/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../routes/paths';

export const NotFoundPage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
    <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-text-muted)]">
      404 · Page not found
    </p>
    <h1 className="font-display font-extrabold text-3xl tracking-tight text-[var(--color-text-main)]">
      This page is not on the Oja map.
    </h1>
    <p className="text-sm text-[var(--color-text-muted)] max-w-md">
      The link may be broken, or the item may no longer be available.
    </p>
    <Link
      to={paths.home}
      className="px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
    >
      Back to the marketplace
    </Link>
  </div>
);
