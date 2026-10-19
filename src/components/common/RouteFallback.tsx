/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LoaderCircle } from 'lucide-react';

/** Shown while a route's data (or the auth session) is still loading. */
export const RouteFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading page">
    <LoaderCircle className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
  </div>
);
