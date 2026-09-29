# Oja GO_LIVE — demo to real money in four steps

What the code already does at every step: the repository interface
(`src/data/repo.ts`) is identical in mock and Supabase mode; fees, penalties,
transitions, and role guards are enforced in both. What changes per step is
configuration and real-world trust, not application logic.

## Step A — public demo on Netlify (fake money, demo mode)

You do by hand:

1. Push `main` to GitHub (already done: `git push origin main`).
2. Netlify > Add new site > Import from Git > pick the repo.
3. Build command `npm run build`, publish directory `dist`.
4. Add a `public/_redirects` file containing `/* /index.html 200` BEFORE
   deploying, or client-side deep links break (Netlify serves the SPA shell
   for every route). This file does not exist yet; create it in this step.
5. Environment: leave `VITE_APP_MODE` unset (demo is the default) or set it
   to `demo`. Do NOT set Supabase variables yet.

The code already does: offline mock database with 32 users, 6 businesses,
103 listings, all order states, persona bar, demo banner, Reset demo data,
local feedback queue, full footer.

What can go wrong: Netlify builds with `npm install` (no `--legacy-peer-deps`
flag). `package.json` pins `esbuild ^0.25.0` while `vite ^8.3.0` wants
`^0.27.0 || ^0.28.0`; a strict install fails with ERESOLVE. Fix before this
step: bump the `esbuild` devDependency to `^0.28.0` (one-line change, then
`npm install`, typecheck, build, commit).

## Step B — closed beta on real Supabase (fake money)

You do by hand:

1. Create a Supabase project (closest region, e.g. EU West).
2. SQL Editor: paste the whole `supabase/schema.sql` and Run. It is
   idempotent in sections (CREATE IF NOT EXISTS, DROP POLICY IF EXISTS) but
   the `cron.schedule` calls in section 10 and the seeds re-run safely.
3. Enable extensions: Database > Extensions > `pg_trgm` (fuzzy search),
   `pg_cron` (section 10 sweeps). The schema file issues CREATE EXTENSION
   for both, but confirm they show as enabled.
4. Auth > Hooks: this is the step the SQL file CANNOT do. Triggers on
   `auth.users` cannot be created from the SQL editor, so wire
   `public.validate_cu_user_auth()` as a Postgres Auth Hook (Dashboard >
   Auth > Hooks) so non-`@stu.cu.edu.ng` or unverified Google identities are
   rejected before a session exists. Until this is wired, enforcement is the
   `profiles.school_email` CHECK constraint plus client checks only.
   Correction to an old claim: the Supabase dashboard Google provider has NO
   domain-restriction setting; the Google Cloud Console "hd" hint the client
   sends (`supabaseRepo.signInWithGoogleSchool`) is UX only and is never
   trusted.
5. Auth > Providers > Google: add the Google OAuth client ID/secret (Google
   Cloud Console credentials for the project). Set the Supabase Site URL to
   the Netlify URL (Auth > URL Configuration), and add redirect URLs for the
   Netlify domain and `http://localhost:3000` for local testing.
6. Storage: create a bucket for listing photos (the client uploads there in
   Supabase mode; mock mode uses compressed data URLs). Wire the bucket name
   into the listing photo flow before admitting sellers.
7. Email: Project Settings > Auth > SMTP: Gmail `smtp.gmail.com:587` with an
   app password (daily sending limits apply, see INTEGRATIONS.md), so the
   6-digit personal-email codes actually arrive.
8. Netlify environment: `VITE_APP_MODE=public`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`. Redeploy. Without the Supabase variables the
   app halts on the Database Configuration error screen by design; it never
   silently falls back to mock data.
9. In-app: sign in with a founding email
   (`tobilobajagun@gmail.com`, `ejagun.2401221@stu.cu.edu.ng`), verify it,
   confirm Super admin bootstrap, then promote the beta moderators, payment
   verifiers, and logistics admins from Users.

What can go wrong: OAuth redirect mismatch (exact URLs matter, including
trailing slashes); free Supabase projects pause after inactivity (first
request after pause is slow); Gmail SMTP app passwords break when the Google
password changes; `pg_cron` jobs silently do nothing if the extension is not
enabled (check `cron.job` and run each `sweep_*()` function once by hand).

## Step C — open to Covenant students (still fake money)

You do by hand:

1. Google OAuth consent screen: move from Testing to Published/External.
   Testing status caps usage at 100 test users; every student beyond that
   gets an access-denied error until publishing completes (verification can
   take days, so start early).
2. Announce with the demo banner OFF (public mode has no demo UI) and the
   feedback button as the support channel (WhatsApp + email + saved queue).
3. Watch the admin Today screen daily: payments queue, seller applications,
   reports, late orders. Tune `app_settings` (delivery promise hours, late
   penalty rate, alert threshold) from the Settings surface.
4. Run a supervised payout cycle: payment verifier matches transfer
   references to bank alerts, marks payouts paid, reconciles the Kuda escrow
   account offline.

What can go wrong: a surge of seller applications overwhelms one moderator
(promote hall reps as moderators early); students sign up with personal
Gmail via the email path and expect seller rights (seller approval stays
manual); disputed Pay-on-Delivery handover where the agent waits while a
verifier confirms in-app (known OPEN risk, staff the verifier rota).

## Step D — real money

Do NOT take real money until ALL of these hold:

1. Written school permission from Covenant University for student commerce
   on the platform (OPEN item from the requirements).
2. A Paystack or Flutterwave integration replaces manual transfer-reference
   matching (currently a human compares references to bank alerts).
3. The seller payout method and schedule is decided and implemented (OPEN:
   currently manual admin-marked payouts to profile bank details).
4. The Nigeria Data Protection Act deletion flow exists (see PRIVACY.md;
   currently only collection is documented).
5. Error monitoring and analytics are wired (both optional in INTEGRATIONS.md).
6. A second review of `supabase/schema.sql` sections 8–11 against a staging
   project with EXPLAIN on the board and queue queries under real data volume.

What can go wrong: everything involving other people's money. Keep the
manual verification queue running in parallel with any gateway for the first
month; never auto-release escrow on a gateway webhook alone until webhooks
are signature-verified and idempotent.
