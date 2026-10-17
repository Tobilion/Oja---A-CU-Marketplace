-- ==============================================================================
-- OJA PATCH — fix infinite recursion (Postgres 42P17) in RLS policies
-- Date: 2026-10-17
--
-- Symptom this fixes:
--   REST calls to profiles / businesses / sub_orders / reports / audit_logs /
--   order_items fail with HTTP 500:
--   {"code":"42P17","message":"infinite recursion detected in policy for
--   relation \"profiles\""}
--
-- Cause: policies checked the caller's admin level with an inline subquery on
-- public.profiles, e.g.
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ...)
-- Evaluating the subquery re-enters the profiles SELECT policy, which contains
-- the same subquery, forever.
--
-- Fix: admin checks go through public.current_admin_level(), a SECURITY
-- DEFINER helper. It runs as the table owner (which bypasses RLS), so the
-- lookup happens once with no policy re-entry.
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query, paste this whole
-- file, Run. Safe to run more than once (every policy is dropped first).
-- ==============================================================================

-- 1. Helper: the only sanctioned way to read the caller's admin level from a
--    policy or client-side code path.
CREATE OR REPLACE FUNCTION public.current_admin_level()
RETURNS admin_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT admin_level FROM public.profiles WHERE id = auth.uid() $$;

-- 2. Profiles
DROP POLICY IF EXISTS profiles_owner_or_admin_read ON public.profiles;
CREATE POLICY profiles_owner_or_admin_read ON public.profiles FOR SELECT USING (
    auth.uid() = id OR
    public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE USING (
  public.current_admin_level() IS NOT NULL
);

-- 3. Halls & app settings (Super admin writes)
DROP POLICY IF EXISTS halls_admin_write ON public.halls;
CREATE POLICY halls_admin_write ON public.halls FOR UPDATE USING (
  public.current_admin_level() = 'super_admin'
);

DROP POLICY IF EXISTS settings_super_admin_write ON public.app_settings;
CREATE POLICY settings_super_admin_write ON public.app_settings FOR UPDATE USING (
  public.current_admin_level() = 'super_admin'
);

-- 4. Businesses
DROP POLICY IF EXISTS businesses_public_read ON public.businesses;
CREATE POLICY businesses_public_read ON public.businesses FOR SELECT USING (
  status = 'approved' OR owner_id = auth.uid() OR
  public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS businesses_owner_update ON public.businesses;
CREATE POLICY businesses_owner_update ON public.businesses FOR UPDATE USING (
  owner_id = auth.uid() OR
  public.current_admin_level() IS NOT NULL
);

-- 5. Listings (recycle-bin delete)
DROP POLICY IF EXISTS listings_owner_delete ON public.listings;
CREATE POLICY listings_owner_delete ON public.listings FOR DELETE USING (
  seller_id = auth.uid() OR
  public.current_admin_level() IN ('super_admin', 'moderator')
);

-- 6. Sub-orders (buyer/seller/agent reads; admin update for payouts)
DROP POLICY IF EXISTS sub_orders_participant_read ON public.sub_orders;
CREATE POLICY sub_orders_participant_read ON public.sub_orders FOR SELECT USING (
  seller_id = auth.uid() OR
  agent_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = sub_orders.order_id AND orders.buyer_id = auth.uid()) OR
  public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS sub_orders_admin_update ON public.sub_orders;
CREATE POLICY sub_orders_admin_update ON public.sub_orders FOR UPDATE USING (
  public.current_admin_level() IN ('super_admin', 'payment_verifier')
) WITH CHECK (
  public.current_admin_level() IN ('super_admin', 'payment_verifier')
);

-- 7. Orders (admin update for verification, disputes, cancellations)
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE USING (
  public.current_admin_level() IS NOT NULL
) WITH CHECK (
  public.current_admin_level() IS NOT NULL
);

-- 8. Chat (participants; admins on reported threads)
DROP POLICY IF EXISTS chat_threads_participant_read ON public.chat_threads;
CREATE POLICY chat_threads_participant_read ON public.chat_threads FOR SELECT USING (
  auth.uid() = ANY(participant_ids) OR
  (is_reported = true AND public.current_admin_level() IS NOT NULL)
);

DROP POLICY IF EXISTS chat_messages_participant_read ON public.chat_messages;
CREATE POLICY chat_messages_participant_read ON public.chat_messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE chat_threads.id = chat_messages.thread_id
    AND chat_threads.is_reported = true
    AND public.current_admin_level() IS NOT NULL
  )
);

-- 9. Reports
DROP POLICY IF EXISTS reports_admin_read ON public.reports;
CREATE POLICY reports_admin_read ON public.reports FOR SELECT USING (
  reporter_id = auth.uid() OR
  public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS reports_admin_update ON public.reports;
CREATE POLICY reports_admin_update ON public.reports FOR UPDATE USING (
  public.current_admin_level() IS NOT NULL
);

-- 10. Audit logs
DROP POLICY IF EXISTS audit_admin_read ON public.audit_logs;
CREATE POLICY audit_admin_read ON public.audit_logs FOR SELECT USING (
  public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS audit_admin_insert ON public.audit_logs;
CREATE POLICY audit_admin_insert ON public.audit_logs FOR INSERT WITH CHECK (
  public.current_admin_level() IS NOT NULL
);

-- 11. Order items (follows the parent sub-order's visibility)
DROP POLICY IF EXISTS order_items_participant_read ON public.order_items;
CREATE POLICY order_items_participant_read ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sub_orders s WHERE s.id = order_items.sub_order_id AND (
      s.seller_id = auth.uid() OR s.agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = s.order_id AND o.buyer_id = auth.uid()) OR
      public.current_admin_level() IS NOT NULL
    )
  )
);

-- 12. Feedback queue
DROP POLICY IF EXISTS feedback_admin_read ON public.feedback;
CREATE POLICY feedback_admin_read ON public.feedback FOR SELECT USING (
  public.current_admin_level() IS NOT NULL
);

DROP POLICY IF EXISTS feedback_admin_update ON public.feedback;
CREATE POLICY feedback_admin_update ON public.feedback FOR UPDATE USING (
  public.current_admin_level() IS NOT NULL
) WITH CHECK (
  public.current_admin_level() IS NOT NULL
);

-- 13. Verification: every row below must show the recursion-free USING clause.
--     (Optional check; run after the statements above.)
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual ILIKE '%profiles%' OR with_check ILIKE '%profiles%')
ORDER BY tablename, policyname;
-- Expected: zero rows. After the fix, no policy body mentions profiles at all
-- (admin checks call public.current_admin_level() instead).
