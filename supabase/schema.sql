-- ==============================================================================
-- OJA CAMPUS MARKETPLACE — COMPLETE SUPABASE DATABASE SCHEMA
-- Target Database: PostgreSQL 15+ (Supabase)
-- Includes: Tables, Constraints, Indexes, RLS Policies, Functions, Triggers, Seeds
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_gender AS ENUM ('male', 'female');
    CREATE TYPE hall_gender AS ENUM ('male', 'female', 'mixed');
    CREATE TYPE admin_level AS ENUM ('super_admin', 'moderator', 'payment_verifier', 'logistics_admin');
    CREATE TYPE item_condition AS ENUM ('New', 'Like new', 'Good', 'Fair');
    CREATE TYPE listing_status AS ENUM ('active', 'in_recycle_bin', 'banned', 'sold_out');
    CREATE TYPE post_as_mode AS ENUM ('me', 'business', 'both');
    CREATE TYPE biz_status AS ENUM ('pending', 'approved', 'rejected');
    CREATE TYPE delivery_mode AS ENUM ('room_delivery', 'pickup');
    CREATE TYPE payment_mode AS ENUM ('pay_oja', 'pay_on_delivery', 'pay_seller_direct');
    CREATE TYPE payment_status AS ENUM ('pending_verification', 'verified', 'rejected', 'not_applicable');
    CREATE TYPE order_state AS ENUM (
      'awaiting_payment',
      'payment_confirmed',
      'seller_accepted',
      'ready',
      'agent_assigned',
      'picked_up',
      'out_for_delivery',
      'delivered',
      'completed',
      'cancelled',
      'refunded',
      'disputed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES

-- Halls
CREATE TABLE IF NOT EXISTS public.halls (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender hall_gender NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT NOT NULL DEFAULT 'Package',
    dynamic_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    personal_email TEXT,
    school_email TEXT NOT NULL,
    is_school_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_personal_email_verified BOOLEAN NOT NULL DEFAULT false,
    hall_id TEXT REFERENCES public.halls(id),
    room_number TEXT NOT NULL,
    gender user_gender NOT NULL,
    telegram_handle TEXT NOT NULL,
    matric_number TEXT,
    reg_number TEXT,
    bio TEXT,
    avatar_url TEXT,
    badges TEXT[] NOT NULL DEFAULT ARRAY['Member']::TEXT[],
    admin_level admin_level,
    bank_details JSONB,
    is_seller_approved BOOLEAN NOT NULL DEFAULT false,
    seller_application_status TEXT NOT NULL DEFAULT 'none',
    seller_application_date TIMESTAMPTZ,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT school_email_domain_check CHECK (school_email LIKE '%@stu.cu.edu.ng')
);

-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    logo TEXT,
    banner TEXT,
    category_id TEXT REFERENCES public.categories(id),
    contact TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id),
    status biz_status NOT NULL DEFAULT 'pending',
    proof_url TEXT,
    members_post_freely BOOLEAN NOT NULL DEFAULT true,
    member_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    blocked_member_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    follower_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listings
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id),
    condition item_condition NOT NULL DEFAULT 'Good',
    price BIGINT NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    seller_id UUID NOT NULL REFERENCES public.profiles(id),
    business_id UUID REFERENCES public.businesses(id),
    post_as post_as_mode NOT NULL DEFAULT 'me',
    default_delivery_days INTEGER NOT NULL DEFAULT 1,
    dynamic_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    status listing_status NOT NULL DEFAULT 'active',
    recycled_at TIMESTAMPTZ,
    views_count INTEGER NOT NULL DEFAULT 0,
    is_reported BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    delivery_mode delivery_mode NOT NULL DEFAULT 'room_delivery',
    delivery_hall_id TEXT REFERENCES public.halls(id),
    delivery_room TEXT NOT NULL,
    delivery_notes TEXT,
    payment_mode payment_mode NOT NULL DEFAULT 'pay_oja',
    payment_status payment_status NOT NULL DEFAULT 'pending_verification',
    payment_reference TEXT,
    sender_account_name TEXT,
    payment_amount_paid BIGINT,
    delivery_fee_total BIGINT NOT NULL DEFAULT 0,
    items_subtotal BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    status order_state NOT NULL DEFAULT 'awaiting_payment',
    delivery_code CHAR(4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub Orders (1 per seller in the order)
CREATE TABLE IF NOT EXISTS public.sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id),
    business_id UUID REFERENCES public.businesses(id),
    status order_state NOT NULL DEFAULT 'awaiting_payment',
    subtotal BIGINT NOT NULL DEFAULT 0,
    delivery_fee BIGINT NOT NULL DEFAULT 0,
    items_count INTEGER NOT NULL DEFAULT 0,
    delivery_time_agreed_hours INTEGER,
    seller_accepted_at TIMESTAMPTZ,
    agent_id UUID REFERENCES public.profiles(id),
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    penalty_amount BIGINT NOT NULL DEFAULT 0,
    seller_payout_amount BIGINT NOT NULL DEFAULT 0,
    seller_paid_out BOOLEAN NOT NULL DEFAULT false,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id),
    sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id),
    target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'chat_thread')),
    target_id TEXT NOT NULL,
    target_title TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat Threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_ids UUID[] NOT NULL,
    last_message_snippet TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_request BOOLEAN NOT NULL DEFAULT true,
    is_blocked_by UUID REFERENCES public.profiles(id),
    is_reported BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    referenced_order_id UUID REFERENCES public.orders(id),
    referenced_order_data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link_id TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INT PRIMARY KEY DEFAULT 1,
    oja_bank_name TEXT NOT NULL DEFAULT 'Kuda Microfinance Bank',
    oja_account_number TEXT NOT NULL DEFAULT '2001928374',
    oja_account_name TEXT NOT NULL DEFAULT 'Oja Escrow Operations',
    delivery_promise_hours INTEGER NOT NULL DEFAULT 48,
    late_penalty_rate_percent INTEGER NOT NULL DEFAULT 5,
    late_threshold_days_alert INTEGER NOT NULL DEFAULT 2,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_seller ON public.sub_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_agent ON public.sub_orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES & VIEWS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- M-02: Public Profile View (Strips room_number, matric_number, reg_number, personal_email, school_email, bank_details)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
    id,
    full_name,
    username,
    hall_id,
    gender,
    telegram_handle,
    bio,
    avatar_url,
    badges,
    admin_level,
    is_seller_approved,
    rating_average,
    rating_count,
    created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Profiles: Full profile private to owner and authorized admins
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_owner_or_admin_read ON public.profiles FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);

-- B-04: Prevent self-escalation on profiles
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF (auth.uid() IS NOT NULL AND auth.uid() = NEW.id) THEN
        IF (NEW.admin_level IS DISTINCT FROM OLD.admin_level OR
            NEW.badges IS DISTINCT FROM OLD.badges OR
            NEW.is_seller_approved IS DISTINCT FROM OLD.is_seller_approved OR
            NEW.seller_application_status IS DISTINCT FROM OLD.seller_application_status OR
            NEW.is_suspended IS DISTINCT FROM OLD.is_suspended OR
            NEW.rating_average IS DISTINCT FROM OLD.rating_average OR
            NEW.rating_count IS DISTINCT FROM OLD.rating_count) THEN
            
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND admin_level = 'super_admin'
            ) THEN
                RAISE EXCEPTION 'Unauthorized: Users cannot modify administrative levels, badges, or seller verification.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- Listings: Public read active, seller write
CREATE POLICY listings_public_read ON public.listings FOR SELECT USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY listings_seller_insert ON public.listings FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY listings_seller_update ON public.listings FOR UPDATE USING (seller_id = auth.uid());

-- Orders & SubOrders: Buyer & Seller isolation
CREATE POLICY orders_buyer_read ON public.orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY sub_orders_participant_read ON public.sub_orders FOR SELECT USING (
  seller_id = auth.uid() OR
  agent_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = sub_orders.order_id AND orders.buyer_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);

-- Chat: Participants only (Admins can view reported threads)
CREATE POLICY chat_threads_participant_read ON public.chat_threads FOR SELECT USING (
  auth.uid() = ANY(participant_ids) OR
  (is_reported = true AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL
  ))
);
CREATE POLICY chat_messages_participant_read ON public.chat_messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE chat_threads.id = chat_messages.thread_id
    AND chat_threads.is_reported = true
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
  )
);

-- 6. CORE DATABASE FUNCTIONS

-- Auth verification trigger: Enforce @stu.cu.edu.ng and Google verified status
CREATE OR REPLACE FUNCTION public.validate_cu_user_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT (LOWER(NEW.email) LIKE '%@stu.cu.edu.ng' OR LOWER(NEW.email) IN ('tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng')) THEN
        RAISE EXCEPTION 'Access denied: Only official Covenant University accounts (@stu.cu.edu.ng) may register on Oja.';
    END IF;
    IF (NEW.raw_app_meta_data->>'provider' = 'google' AND (NEW.raw_user_meta_data->>'email_verified')::boolean IS NOT TRUE) THEN
        RAISE EXCEPTION 'Access denied: Google account email must be verified.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Review eligibility trigger: Enforce completed order
CREATE OR REPLACE FUNCTION public.validate_review_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.sub_orders s ON s.order_id = o.id
        JOIN public.order_items i ON i.sub_order_id = s.id
        WHERE o.buyer_id = NEW.buyer_id
          AND i.listing_id = NEW.listing_id
          AND s.status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Reviews are restricted to verified buyers who completed an order for this item.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_review_eligibility ON public.reviews;
CREATE TRIGGER trg_validate_review_eligibility
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_eligibility();

-- Bootstrap Founding Admin Function
CREATE OR REPLACE FUNCTION public.bootstrap_admin(user_email TEXT, user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF (LOWER(user_email) IN ('tobilobajagun@gmail.com', 'ejagun.2401221@stu.cu.edu.ng')) THEN
        UPDATE public.profiles
        SET admin_level = 'super_admin',
            badges = array_append(array_remove(badges, 'Admin'), 'Admin')
        WHERE id = user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Place Order Function (Full implementation: validates stock, inserts orders, sub_orders, order_items)
CREATE OR REPLACE FUNCTION public.place_order(
    p_buyer_id UUID,
    p_delivery_mode delivery_mode,
    p_delivery_hall_id TEXT,
    p_delivery_room TEXT,
    p_delivery_notes TEXT,
    p_payment_mode payment_mode,
    p_items JSONB, -- array of {listing_id, quantity}
    p_order_number TEXT,
    p_delivery_code CHAR(4)
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_sub_order_id UUID;
    v_item RECORD;
    v_listing RECORD;
    v_seller_id UUID;
    v_seller RECORD;
    v_business_id UUID;
    v_seller_subtotal BIGINT;
    v_seller_count INT;
    v_seller_fee BIGINT;
    v_items_subtotal BIGINT := 0;
    v_delivery_fee_total BIGINT := 0;
    v_total_amount BIGINT := 0;
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart is empty. Cannot place order.';
    END IF;

    -- 1. Validate items and lock rows
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(listing_id UUID, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero.';
        END IF;

        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;
        IF v_listing.seller_id = p_buyer_id THEN
            RAISE EXCEPTION 'You cannot buy your own listing (%)', v_listing.title;
        END IF;
        IF v_listing.status != 'active' THEN
            RAISE EXCEPTION 'Listing % is not available', v_listing.title;
        END IF;
        IF v_listing.stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for listing: %. Available: %, Requested: %', v_listing.title, v_listing.stock, v_item.quantity;
        END IF;

        -- Decrement stock atomically
        UPDATE public.listings
        SET stock = stock - v_item.quantity,
            status = CASE WHEN stock - v_item.quantity = 0 THEN 'sold_out'::listing_status ELSE status END
        WHERE id = v_item.listing_id;
    END LOOP;

    -- 2. Create primary order record
    INSERT INTO public.orders (
        order_number, buyer_id, delivery_mode, delivery_hall_id, delivery_room,
        delivery_notes, payment_mode, delivery_code, status, payment_status
    ) VALUES (
        p_order_number, p_buyer_id, p_delivery_mode, p_delivery_hall_id, p_delivery_room,
        p_delivery_notes, p_payment_mode, p_delivery_code,
        CASE WHEN p_payment_mode = 'pay_on_delivery' THEN 'payment_confirmed'::order_state ELSE 'awaiting_payment'::order_state END,
        CASE WHEN p_payment_mode = 'pay_on_delivery' THEN 'not_applicable'::payment_status ELSE 'pending_verification'::payment_status END
    ) RETURNING id INTO v_order_id;

    -- 3. Group items by seller and create sub-orders
    FOR v_seller_id IN
        SELECT DISTINCT l.seller_id
        FROM jsonb_to_recordset(p_items) AS x(listing_id UUID, quantity INT)
        JOIN public.listings l ON l.id = x.listing_id
    LOOP
        SELECT * INTO v_seller FROM public.profiles WHERE id = v_seller_id;
        
        -- Compute subtotal for this seller
        SELECT 
            COALESCE(SUM(l.price * x.quantity), 0),
            COALESCE(SUM(x.quantity), 0),
            MAX(l.business_id)
        INTO v_seller_subtotal, v_seller_count, v_business_id
        FROM jsonb_to_recordset(p_items) AS x(listing_id UUID, quantity INT)
        JOIN public.listings l ON l.id = x.listing_id
        WHERE l.seller_id = v_seller_id;

        -- Compute delivery fee (₦0 for pickup, ₦500 if < 10,000 & < 5 items, else ₦1,000)
        IF p_delivery_mode = 'pickup' THEN
            v_seller_fee := 0;
        ELSE
            IF v_seller_subtotal < 10000 AND v_seller_count < 5 THEN
                v_seller_fee := 500;
            ELSE
                v_seller_fee := 1000;
            END IF;
        END IF;

        v_items_subtotal := v_items_subtotal + v_seller_subtotal;
        v_delivery_fee_total := v_delivery_fee_total + v_seller_fee;

        -- Insert sub-order
        INSERT INTO public.sub_orders (
            order_id, seller_id, business_id, status, subtotal, delivery_fee,
            items_count, seller_payout_amount, status_timeline
        ) VALUES (
            v_order_id, v_seller_id, v_business_id,
            CASE WHEN p_payment_mode = 'pay_on_delivery' THEN 'payment_confirmed'::order_state ELSE 'awaiting_payment'::order_state END,
            v_seller_subtotal, v_seller_fee, v_seller_count, v_seller_subtotal,
            jsonb_build_array(jsonb_build_object('state', CASE WHEN p_payment_mode = 'pay_on_delivery' THEN 'payment_confirmed' ELSE 'awaiting_payment' END, 'timestamp', now(), 'note', 'Order placed by buyer'))
        ) RETURNING id INTO v_sub_order_id;

        -- Insert order items for this sub-order
        INSERT INTO public.order_items (
            sub_order_id, listing_id, title, price, quantity, image, category_id
        )
        SELECT 
            v_sub_order_id, l.id, l.title, l.price, x.quantity, COALESCE(l.images[1], ''), l.category_id
        FROM jsonb_to_recordset(p_items) AS x(listing_id UUID, quantity INT)
        JOIN public.listings l ON l.id = x.listing_id
        WHERE l.seller_id = v_seller_id;
    END LOOP;

    -- 4. Hall discount (parity with calculateOrderDeliveryFee): when two or
    -- more sellers in this order share the same hall, each qualifying
    -- sub-order fee is halved. Base fees are 500/1000 so halving stays integral.
    UPDATE public.sub_orders so
    SET delivery_fee = ROUND(so.delivery_fee * 0.5)
    WHERE so.order_id = v_order_id
      AND EXISTS (SELECT 1 FROM public.profiles p1 WHERE p1.id = so.seller_id AND p1.hall_id IS NOT NULL)
      AND (
        SELECT COUNT(*)
        FROM public.sub_orders so2
        JOIN public.profiles p1 ON p1.id = so.seller_id
        JOIN public.profiles p2 ON p2.id = so2.seller_id
        WHERE so2.order_id = v_order_id
          AND p2.hall_id IS NOT DISTINCT FROM p1.hall_id
      ) >= 2;

    -- 5. Recompute order totals from the final (possibly discounted) sub-orders
    SELECT COALESCE(SUM(subtotal), 0), COALESCE(SUM(delivery_fee), 0)
    INTO v_items_subtotal, v_delivery_fee_total
    FROM public.sub_orders WHERE order_id = v_order_id;

    -- Update order totals
    UPDATE public.orders
    SET items_subtotal = v_items_subtotal,
        delivery_fee_total = v_delivery_fee_total,
        total_amount = v_items_subtotal + v_delivery_fee_total
    WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate & Apply Late Delivery Penalty
CREATE OR REPLACE FUNCTION public.apply_late_penalty(
    p_sub_order_id UUID,
    p_hours_late NUMERIC
) RETURNS BIGINT AS $$
DECLARE
    v_subtotal BIGINT;
    v_days_late NUMERIC;
    v_penalty BIGINT := 0;
BEGIN
    SELECT subtotal INTO v_subtotal FROM public.sub_orders WHERE id = p_sub_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sub-order % not found', p_sub_order_id;
    END IF;

    IF p_hours_late <= 0 THEN
        RETURN 0;
    END IF;

    v_days_late := CEIL(p_hours_late / 24.0);
    -- Parity with calculateLatePenalty (deliveryFee.ts): per-day penalty is
    -- 5% of subtotal with a N200 daily floor, capped at 50% of subtotal.
    v_penalty := LEAST(
        v_days_late * GREATEST(200, ROUND(v_subtotal * 0.05)),
        ROUND(v_subtotal * 0.50)
    )::BIGINT;

    UPDATE public.sub_orders
    SET penalty_amount = v_penalty,
        seller_payout_amount = GREATEST(0, subtotal - v_penalty),
        updated_at = now()
    WHERE id = p_sub_order_id;

    RETURN v_penalty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Advance Order Status & Permissions Validation (Strict role and adminLevel checks)
CREATE OR REPLACE FUNCTION public.advance_order_status(
    p_order_id UUID,
    p_sub_order_id UUID,
    p_next_state order_state,
    p_actor_id UUID,
    p_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_sub_order RECORD;
    v_actor RECORD;
    v_buyer_id UUID;
BEGIN
    SELECT * INTO v_sub_order FROM public.sub_orders WHERE id = p_sub_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sub-order % not found', p_sub_order_id;
    END IF;
    SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;

    -- H-04 legality guard: mirror of VALID_ORDER_TRANSITIONS (transitions.ts).
    -- Any pair not listed here is rejected before role checks run.
    IF NOT (
        (v_sub_order.status = 'awaiting_payment' AND p_next_state IN ('payment_confirmed', 'cancelled')) OR
        (v_sub_order.status = 'payment_confirmed' AND p_next_state IN ('seller_accepted', 'cancelled', 'refunded')) OR
        (v_sub_order.status = 'seller_accepted' AND p_next_state IN ('ready', 'cancelled', 'disputed')) OR
        (v_sub_order.status = 'ready' AND p_next_state IN ('agent_assigned', 'cancelled', 'disputed')) OR
        (v_sub_order.status = 'agent_assigned' AND p_next_state IN ('picked_up', 'disputed', 'cancelled')) OR
        (v_sub_order.status = 'picked_up' AND p_next_state IN ('out_for_delivery', 'disputed')) OR
        (v_sub_order.status = 'out_for_delivery' AND p_next_state IN ('delivered', 'disputed')) OR
        (v_sub_order.status = 'delivered' AND p_next_state IN ('completed', 'disputed')) OR
        (v_sub_order.status = 'completed' AND p_next_state IN ('disputed')) OR
        (v_sub_order.status = 'disputed' AND p_next_state IN ('refunded', 'completed', 'cancelled'))
    ) THEN
        RAISE EXCEPTION 'Illegal state transition from "%" to "%".', v_sub_order.status, p_next_state;
    END IF;

    -- Strict authorization checks
    IF p_next_state = 'payment_confirmed' THEN
        IF v_actor.admin_level NOT IN ('super_admin', 'payment_verifier') THEN
            RAISE EXCEPTION 'Only Payment Verifiers or Super Admins can confirm payments.';
        END IF;
    ELSIF p_next_state = 'refunded' THEN
        IF v_actor.admin_level NOT IN ('super_admin', 'payment_verifier') THEN
            RAISE EXCEPTION 'Only Payment Verifiers or Super Admins can authorize refunds.';
        END IF;
    ELSIF p_next_state = 'seller_accepted' OR p_next_state = 'ready' THEN
        IF v_actor.id != v_sub_order.seller_id AND v_actor.admin_level != 'super_admin' THEN
            RAISE EXCEPTION 'Only the assigned seller can accept or mark items ready.';
        END IF;
    ELSIF p_next_state = 'agent_assigned' OR p_next_state = 'picked_up' OR p_next_state = 'out_for_delivery' OR p_next_state = 'delivered' THEN
        IF v_actor.id != v_sub_order.agent_id AND v_actor.admin_level NOT IN ('super_admin', 'logistics_admin') THEN
            RAISE EXCEPTION 'Only assigned delivery agents or logistics admins can advance transit states.';
        END IF;
    ELSIF p_next_state = 'completed' THEN
        -- Buyer confirms receipt (parity with transitions.ts: buyer or Super
        -- admin only). The 48h auto-confirm sweep writes completed directly
        -- with its own timeline note instead of calling this RPC.
        SELECT o.buyer_id INTO v_buyer_id FROM public.orders o WHERE o.id = p_order_id;
        IF v_actor.id IS DISTINCT FROM v_buyer_id AND v_actor.admin_level IS DISTINCT FROM 'super_admin' THEN
            RAISE EXCEPTION 'Only the buyer or system auto-confirm can complete the order.';
        END IF;
    ELSIF p_next_state = 'cancelled' THEN
        IF v_actor.admin_level IS NOT NULL AND v_actor.admin_level NOT IN ('super_admin', 'moderator') THEN
            RAISE EXCEPTION 'Only a Moderator or Super Admin can cancel active orders.';
        END IF;
    ELSIF p_next_state = 'disputed' THEN
        IF v_actor.admin_level IS NOT NULL AND v_actor.admin_level NOT IN ('super_admin', 'moderator') THEN
            RAISE EXCEPTION 'Only parties to the order or moderators can dispute an order.';
        END IF;
    END IF;

    -- Update sub-order status and append to status timeline
    UPDATE public.sub_orders
    SET status = p_next_state,
        status_timeline = status_timeline || jsonb_build_object('state', p_next_state, 'timestamp', now(), 'note', p_note),
        updated_at = now()
    WHERE id = p_sub_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. INITIAL SEEDS (Halls & Categories)
INSERT INTO public.halls (id, name, gender, active) VALUES
('hall_peter', 'Peter Hall', 'male', true),
('hall_joseph', 'Joseph Hall', 'male', true),
('hall_paul', 'Paul Hall', 'male', true),
('hall_daniel', 'Daniel Hall', 'male', true),
('hall_john', 'John Hall', 'male', true),
('hall_samuel', 'Samuel Hall', 'male', true),
('hall_mary', 'Mary Hall', 'female', true),
('hall_esther', 'Esther Hall', 'female', true),
('hall_dorcas', 'Dorcas Hall', 'female', true),
('hall_deborah', 'Deborah Hall', 'female', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, icon_name) VALUES
('cat_electronics', 'Electronics & Gadgets', 'electronics', 'Laptops, chargers, accessories', 'Laptop'),
('cat_books', 'Books & Course Materials', 'books', 'Textbooks, past question packs', 'BookOpen'),
('cat_fashion', 'Fashion & Wears', 'fashion', 'Clothing, thrift, sneakers, watches', 'Shirt'),
('cat_food', 'Food & Snacks', 'food', 'Fresh pastries, small chops, snacks', 'Utensils'),
('cat_hostel', 'Hostel Essentials', 'hostel', 'Hangers, buckets, lamps, bedding', 'Home'),
('cat_beauty', 'Beauty & Hair', 'beauty', 'Skincare, cosmetics, hair extensions', 'Sparkles'),
('cat_services', 'Services & Skills', 'services', 'Braiding, laundry, printing, tutoring', 'Wrench'),
('cat_other', 'Other Items', 'other', 'Stationery, musical instruments', 'Package')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_settings (id, oja_bank_name, oja_account_number, oja_account_name)
VALUES (1, 'Kuda Microfinance Bank', '2001928374', 'Oja Escrow Operations')
ON CONFLICT (id) DO NOTHING;

-- 8. PHASE-1 RLS HARDENING (appended; does not alter sections 1-7)
-- Why this section exists: several tables had RLS enabled with no policies
-- (default-deny, breaking reads) or no RLS at all (open to anon write).
-- Sub-orders have SELECT only on purpose: all writes go through the
-- SECURITY DEFINER RPCs (place_order, advance_order_status, apply_late_penalty),
-- which re-check caller identity and role server-side.

-- 8.1 Enable RLS where it was missing
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 8.2 Halls & categories: public read, Super admin write
DROP POLICY IF EXISTS halls_public_read ON public.halls;
CREATE POLICY halls_public_read ON public.halls FOR SELECT USING (true);
DROP POLICY IF EXISTS halls_admin_write ON public.halls;
CREATE POLICY halls_admin_write ON public.halls FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level = 'super_admin')
);

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);

-- 8.3 App settings: any signed-in user may read (bank details are shown at
-- checkout); only Super admins may change fees, penalties, bank details.
DROP POLICY IF EXISTS settings_auth_read ON public.app_settings;
CREATE POLICY settings_auth_read ON public.app_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS settings_super_admin_write ON public.app_settings;
CREATE POLICY settings_super_admin_write ON public.app_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level = 'super_admin')
);

-- 8.4 Profiles: allow a new user to insert ONLY their own row.
-- The school-email domain CHECK constraint on profiles plus the Auth Hook in
-- 8.10 enforce @stu.cu.edu.ng server-side; this policy only scopes the row.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8.5 Businesses: public storefronts need approved-business reads.
DROP POLICY IF EXISTS businesses_public_read ON public.businesses;
CREATE POLICY businesses_public_read ON public.businesses FOR SELECT USING (
  status = 'approved' OR owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);
DROP POLICY IF EXISTS businesses_owner_insert ON public.businesses;
CREATE POLICY businesses_owner_insert ON public.businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS businesses_owner_update ON public.businesses;
CREATE POLICY businesses_owner_update ON public.businesses FOR UPDATE USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);

-- 8.6 Listings: sellers and Moderator+ may delete (recycle-bin flow deletes).
DROP POLICY IF EXISTS listings_owner_delete ON public.listings;
CREATE POLICY listings_owner_delete ON public.listings FOR DELETE USING (
  seller_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('super_admin', 'moderator'))
);

-- 8.7 Orders: buyer inserts and updates only their own rows.
-- Status/payment transitions are validated inside advance_order_status and
-- verifyPayment RPCs, never by direct column writes alone.
DROP POLICY IF EXISTS orders_buyer_insert ON public.orders;
CREATE POLICY orders_buyer_insert ON public.orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
DROP POLICY IF EXISTS orders_buyer_update ON public.orders;
CREATE POLICY orders_buyer_update ON public.orders FOR UPDATE USING (buyer_id = auth.uid());

-- 8.8 Reviews: public read; signed-in insert (the trg_validate_review_eligibility
-- trigger rejects reviewers without a completed order for the listing).
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS reviews_verified_insert ON public.reviews;
CREATE POLICY reviews_verified_insert ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8.9 Reports: reporter inserts; Moderator+ reads and resolves.
DROP POLICY IF EXISTS reports_reporter_insert ON public.reports;
CREATE POLICY reports_reporter_insert ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS reports_admin_read ON public.reports;
CREATE POLICY reports_admin_read ON public.reports FOR SELECT USING (
  reporter_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);
DROP POLICY IF EXISTS reports_admin_update ON public.reports;
CREATE POLICY reports_admin_update ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);

-- 8.10 Chat: participants may write; participants and admins on reported
-- threads may read (read policies already exist in section 5).
DROP POLICY IF EXISTS chat_threads_participant_insert ON public.chat_threads;
CREATE POLICY chat_threads_participant_insert ON public.chat_threads FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS chat_messages_participant_insert ON public.chat_messages;
CREATE POLICY chat_messages_participant_insert ON public.chat_messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 8.11 Notifications: owner reads and marks read; inserts come from RPCs or
-- service-role notify() calls, so client insert is scoped to self-notify only.
DROP POLICY IF EXISTS notifications_owner_read ON public.notifications;
CREATE POLICY notifications_owner_read ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_owner_update ON public.notifications;
CREATE POLICY notifications_owner_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- 8.12 Audit logs: admins read; any signed-in admin action may append.
-- Immutability (no UPDATE/DELETE policy) keeps the trail append-only.
DROP POLICY IF EXISTS audit_admin_read ON public.audit_logs;
CREATE POLICY audit_admin_read ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);
DROP POLICY IF EXISTS audit_admin_insert ON public.audit_logs;
CREATE POLICY audit_admin_insert ON public.audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
);

-- 8.13 School-email enforcement (server-side).
-- The earlier claim that the Supabase dashboard Google provider can restrict
-- domains is wrong: Google OAuth has no domain-restriction setting that
-- Supabase enforces. Enforcement must be ALL of:
-- (a) the profiles.school_email CHECK constraint (section 3, always on);
-- (b) a Supabase Auth Hook (Dashboard > Auth > Hooks > Custom Access Token or
--     Send-email hook is NOT enough; use the "MFA/Pre-signup" style Postgres
--     hook) calling public.validate_cu_user_auth() so unverified or
--     non-@stu.cu.edu.ng Google identities are rejected before a session exists;
-- (c) client OAuth hd hint (already sent) for UX only, never trusted.
-- Triggers on auth.users cannot be created from the SQL editor, so (b) is a
-- manual dashboard step documented in GO_LIVE.md (Phase 7).

-- 9. PHASE-2 SCHEMA REPAIR (appended; does not alter sections 1-8)
-- Why: place_order and the review trigger referenced public.order_items, which
-- was never created, and several repository calls used columns that did not
-- exist (business join/transfer requests, review seller/agent rating).
-- Schema is reviewed read-only here, NOT executed (no local Postgres yet).

-- 9.1 Order line items (one row per listing inside a sub-order)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES public.sub_orders(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id),
    title TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    image TEXT NOT NULL DEFAULT '',
    category_id TEXT REFERENCES public.categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_sub_order ON public.order_items(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_listing ON public.order_items(listing_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
-- Reads follow the parent sub-order visibility; writes happen only inside the
-- place_order RPC (SECURITY DEFINER), so no INSERT/UPDATE policy is granted.
DROP POLICY IF EXISTS order_items_participant_read ON public.order_items;
CREATE POLICY order_items_participant_read ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sub_orders s WHERE s.id = order_items.sub_order_id AND (
      s.seller_id = auth.uid() OR s.agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = s.order_id AND o.buyer_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IS NOT NULL)
    )
  )
);

-- 9.2 Business membership queues used by the repository
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS join_requests UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS transfer_request JSONB;

-- 9.3 Review seller/agent columns used by the repository
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agent_rating SMALLINT CHECK (agent_rating IS NULL OR (agent_rating >= 1 AND agent_rating <= 5));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS agent_comment TEXT;

-- 9.4 Review eligibility trigger: the reviews table carries reviewer_id
-- (not buyer_id), so the check must read NEW.reviewer_id. public.order_items
-- now exists, so the JOIN below resolves.
CREATE OR REPLACE FUNCTION public.validate_review_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.sub_orders s ON s.order_id = o.id
        JOIN public.order_items i ON i.sub_order_id = s.id
        WHERE o.buyer_id = NEW.reviewer_id
          AND i.listing_id = NEW.listing_id
          AND s.status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Reviews are restricted to verified buyers who completed an order for this item.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_review_eligibility ON public.reviews;
CREATE TRIGGER trg_validate_review_eligibility
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_eligibility();

-- 10. PHASE-3 SCHEDULED SWEEPS (Supabase mode; demo mode uses MockRepository
-- runScheduledSweeps on app start + every 5 minutes instead).
-- Manual step: enable the pg_cron extension once (Dashboard > Database >
-- Extensions > cron), then run this section. Each job is unscheduled first so
-- re-running the section never creates duplicates. Read-only reviewed here,
-- NOT executed (no live Supabase in this session).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 10.1 Auto-confirm deliveries 48h after handover, with late penalties
CREATE OR REPLACE FUNCTION public.sweep_auto_confirm()
RETURNS INTEGER AS $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, subtotal, seller_accepted_at, delivery_time_agreed_hours
        FROM public.sub_orders
        WHERE status = 'delivered' AND delivered_at < now() - INTERVAL '48 hours'
    LOOP
        UPDATE public.sub_orders
        SET status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            status_timeline = status_timeline || jsonb_build_object('state', 'completed', 'timestamp', now(), 'note', 'Order auto-completed after 48h delivery window expired. Seller payout unlocked.'),
            updated_at = now()
        WHERE id = r.id;
        IF r.seller_accepted_at IS NOT NULL AND r.delivery_time_agreed_hours IS NOT NULL THEN
            PERFORM public.apply_late_penalty(
                r.id,
                EXTRACT(EPOCH FROM (now() - r.seller_accepted_at)) / 3600 - r.delivery_time_agreed_hours
            );
        END IF;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.2 Purge recycle bin after 30 days
CREATE OR REPLACE FUNCTION public.sweep_purge_recycle_bin()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    DELETE FROM public.listings
    WHERE status = 'in_recycle_bin' AND recycled_at < now() - INTERVAL '30 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.3 Backstop: apply late penalties to completed sub-orders missing them
CREATE OR REPLACE FUNCTION public.sweep_late_penalties()
RETURNS INTEGER AS $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT id, seller_accepted_at, delivery_time_agreed_hours, completed_at
        FROM public.sub_orders
        WHERE status = 'completed' AND penalty_amount = 0
          AND seller_accepted_at IS NOT NULL AND delivery_time_agreed_hours IS NOT NULL
          AND completed_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (completed_at - seller_accepted_at)) / 3600 > delivery_time_agreed_hours
    LOOP
        PERFORM public.apply_late_penalty(
            r.id,
            EXTRACT(EPOCH FROM (r.completed_at - r.seller_accepted_at)) / 3600 - r.delivery_time_agreed_hours
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.4 Two-days-late admin alert queue
CREATE OR REPLACE FUNCTION public.sweep_late_alerts()
RETURNS INTEGER AS $$
DECLARE
    admin_rec RECORD;
    late_rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR late_rec IN
        SELECT s.id AS sub_id, o.order_number, s.seller_accepted_at, s.delivery_time_agreed_hours
        FROM public.sub_orders s
        JOIN public.orders o ON o.id = s.order_id
        WHERE s.status NOT IN ('completed', 'cancelled', 'refunded')
          AND s.seller_accepted_at IS NOT NULL AND s.delivery_time_agreed_hours IS NOT NULL
          AND s.seller_accepted_at + (s.delivery_time_agreed_hours + 48) * INTERVAL '1 hour' < now()
          AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.link_id = s.id::TEXT AND n.title = 'Late Delivery Alert'
              AND n.created_at > now() - INTERVAL '24 hours'
          )
    LOOP
        FOR admin_rec IN SELECT id FROM public.profiles WHERE admin_level IS NOT NULL LOOP
            INSERT INTO public.notifications (user_id, title, message, type, link_id)
            VALUES (
                admin_rec.id,
                'Late Delivery Alert',
                'Sub-order of order ' || late_rec.order_number || ' is 2+ days past its promised window. Review for further action.',
                'order',
                late_rec.sub_id::TEXT
            );
        END LOOP;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.unschedule('oja-auto-confirm') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oja-auto-confirm');
SELECT cron.schedule('oja-auto-confirm', '*/30 * * * *', 'SELECT public.sweep_auto_confirm()');
SELECT cron.unschedule('oja-purge-recycle-bin') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oja-purge-recycle-bin');
SELECT cron.schedule('oja-purge-recycle-bin', '0 3 * * *', 'SELECT public.sweep_purge_recycle_bin()');
SELECT cron.unschedule('oja-late-penalties') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oja-late-penalties');
SELECT cron.schedule('oja-late-penalties', '0 * * * *', 'SELECT public.sweep_late_penalties()');
SELECT cron.unschedule('oja-late-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oja-late-alerts');
SELECT cron.schedule('oja-late-alerts', '0 * * * *', 'SELECT public.sweep_late_alerts()');
