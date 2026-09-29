# Oja — Covenant University Campus Marketplace

> "Campus trade, kept honest."

Oja is a verified student marketplace built for students of Covenant University, Nigeria. It provides escrow-protected payments, verified student seller profiles, Amazon-style student business storefronts, and room deliveries by vetted hall runners.

---

## 1. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Icons & Motion:** `lucide-react`, `motion`.
- **Search:** Typo-tolerant fuzzy search using `Fuse.js` with Nigerian student campus synonym expansion (charger/adapter, okrika/thrift, past questions).
- **Data Layer:** Swappable Repository pattern (`src/data/repo.ts`):
  - `MockRepository` (`src/data/mockRepo.ts`): Preloaded with 43 realistic student listings, 12+ profiles across all Covenant halls, verified sellers, businesses, orders, reviews, and audit logs. Operates fully offline in `localStorage`.
  - `SupabaseRepository` (`src/data/supabaseRepo.ts`): Production PostgreSQL integration with Row-Level Security (RLS) policies, atomic stock decrementing, and database triggers.
  - Automatic fallback: If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, Oja runs in Demo Mode with a role switcher.

---

## 2. Setup Guide for Production (Supabase)

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Select your closest region (e.g. EU West).

### Step 2: Run the SQL Schema
1. Open the Supabase project dashboard and navigate to the **SQL Editor**.
2. Open the file `supabase/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This sets up all tables, foreign keys, RLS security policies, stored procedures (`place_order`, `advance_order_status`, `bootstrap_admin`), and initial seeds for Covenant University halls and categories.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` or set in your hosting provider (Vercel/Netlify):
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

### Step 4: Configure School Google OAuth
1. In Supabase Dashboard, go to **Authentication** > **Providers** > **Google**.
2. Add your Google OAuth Client ID and Secret.
3. Restrict authorized domains to `stu.cu.edu.ng` in Google Cloud Console.

### Step 5: Configure Custom SMTP (Gmail)
1. In Supabase Dashboard, go to **Project Settings** > **Authentication** > **SMTP Settings**.
2. Set Host to `smtp.gmail.com`, Port `587`.
3. Set your sender email and Gmail App Password.

---

## 3. Core Business & Financial Logic

### Delivery Fee Engine
All money is stored and calculated in integer Naira (₦).
- **Base Fee:** ₦500 per seller sub-order if that seller's subtotal is **under ₦10,000 AND** item count is **under 5**.
- Otherwise ₦1,000. (₦10,000 exactly, or 5 items exactly, is ₦1,000).
- **Same-Hall Discount:** If two or more sellers in the order reside in the same hall of residence as each other, the delivery fee for those sellers is reduced by **50%**.
- **Pickup Mode:** Selecting self-pickup sets the delivery fee to ₦0.
- Unit tests verify boundary cases: `npx tsx src/utils/deliveryFee.test.ts`.

### Payment Options
1. **Pay Oja (Protected Escrow):** Funds are transferred to the Oja operations account and held until the buyer enters their 4-digit delivery handover code.
2. **Pay on Delivery/Pickup:** Item is physically inspected at handover before payment.
3. **Pay Seller Directly:** Available only for Verified Sellers, accompanied by an explicit warning and mandatory buyer acknowledgment.

### Founding Admin Accounts
The following emails automatically receive **Super Admin** privileges upon verification:
- `tobilobajagun@gmail.com`
- `ejagun.2401221@stu.cu.edu.ng`
