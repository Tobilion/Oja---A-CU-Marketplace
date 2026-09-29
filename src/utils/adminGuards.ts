/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserBadge } from '../types';

/**
 * Scoped carve-out: a Logistics admin may grant or revoke ONLY the Delivery
 * Agent badge (agent create/promote/approve duty). Any other badge diff, or
 * any simultaneous privileged field change, stays Super-admin-only. Enforced
 * identically in the mock repo, the Supabase repo pre-checks, and the SQL
 * trigger. Unit-tested in adminGuards.test.ts.
 */
export function isOnlyDeliveryAgentDiff(before: UserBadge[], after: UserBadge[]): boolean {
  const added = after.filter((b) => !before.includes(b));
  const removed = before.filter((b) => !after.includes(b));
  const changed = [...added, ...removed];
  return changed.length > 0 && changed.every((b) => b === 'Delivery Agent');
}
