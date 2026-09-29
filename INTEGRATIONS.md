# Oja INTEGRATIONS — every external service and API

| Service | Purpose in Oja | Stage needed | Free-tier limit that bites | Env vars | Where to get the key | Manual or automatic |
|---|---|---|---|---|---|---|
| Supabase Postgres | Primary database, RLS, RPCs (`place_order`, `advance_order_status`, `apply_late_penalty`, portal RPCs, sweeps) | B (beta) | Free projects pause after inactivity; first request after pause is slow | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Dashboard > Project Settings > API | Manual: run `supabase/schema.sql` in SQL Editor |
| Supabase Auth (Google) | `@stu.cu.edu.ng` sign-in | B | OAuth consent in Testing = 100 test users max; must publish as External | (dashboard config, no env) | Auth > Providers > Google + Google Cloud Console OAuth client | Manual: client ID/secret, Site URL, redirect URLs |
| Supabase Auth Hooks | Server-side school-email + verified enforcement (`validate_cu_user_auth()`) | B | n/a (config) | none | Dashboard > Auth > Hooks | Manual: wire the function; SQL cannot create `auth.users` triggers. Correction: the dashboard Google provider has NO domain restriction; the client `hd` hint is UX only |
| Supabase Storage | Listing photos in live mode (mock uses compressed data URLs) | B | Free storage quota per project | (bucket wired in listing flow) | Dashboard > Storage > New bucket | Manual: create bucket, set policies |
| Supabase Realtime | Intended for chat/order live updates (not yet subscribed; polling/load on open) | Later | Connection caps on free tier | none yet | — | Not wired; `notify()` hook reserved for it |
| `pg_trgm` extension | Trigram fuzzy search (`idx_listings_search`) | B | n/a | none | Database > Extensions (also `CREATE EXTENSION` in schema) | Manual confirm |
| `pg_cron` extension | Section 10 sweeps: 48h auto-confirm, 30d purge, late penalties, 2-day alerts | B | Jobs silently idle if extension disabled | none | Database > Extensions, then run schema section 10 | Manual: verify `cron.job`, run each `sweep_*()` once |
| Gmail SMTP (or Resend/Brevo) | 6-digit personal-email codes, order/delivery emails (mock logs to dev outbox) | B | Gmail ~500 sends/day, app password breaks on Google password change | (dashboard SMTP settings) | Google Account > App passwords | Manual: `smtp.gmail.com:587` in Project Settings > Auth |
| Google Cloud OAuth | Consent screen + OAuth client for school sign-in | B/C | Testing cap (see above); verification takes days | (dashboard config) | Google Cloud Console > APIs & Services > Credentials | Manual, start before step C |
| Netlify | Hosting for the Vite SPA (`npm run build`, `dist/`) | A | Build minutes quota; `esbuild` ERESOLVE risk (see GO_LIVE step A) | `VITE_*` in Site settings | Netlify dashboard | Manual: import repo, `_redirects` file, env vars |
| GitHub | Source of truth, deploy trigger | A | n/a | none | github.com/Tobilion/Oja---A-CU-Marketplace | Automatic on push to `main` |
| WhatsApp deep link | Feedback send channel (`wa.me/2347073948340` prefilled) | A (shipped) | n/a (user's own WhatsApp) | none (constant `FEEDBACK_WHATSAPP_NUMBER`) | — | Automatic: `feedbackWhatsAppUrl()` |
| `mailto:` | Feedback send channel (`tobilobajagun@gmail.com`) | A (shipped) | Depends on user's mail client | none (constant `FEEDBACK_EMAIL`) | — | Automatic: `feedbackMailtoUrl()` |
| Telegram Bot API | Future order/delivery notifications; `notify()` service is the seam | Later | Bot API rate limits | none yet | @BotFather when needed | Not built; do not touch call sites, only the notify seam |
| Paystack / Flutterwave | Replace manual transfer-reference matching with gateway webhooks | D (real money) | Transaction fees; webhook signing required | none yet | Provider dashboards at step D | Not built (OPEN risk documented in GO_LIVE) |
| Bank list source | Validate seller bank names at application | Later | n/a | none | Paystack bank list API or manual list | Manual entry today (`SellerApplyModal` free text + 10-digit check) |
| Error monitoring (e.g. Sentry) | Capture the `lastError` trail the feedback form already collects | C/D | Event quotas | none yet | Provider dashboard | Not wired |
| Analytics (e.g. Plausible) | Funnel and portal usage | Later | n/a | none yet | Provider dashboard | Not wired |
| Domain + DNS | Custom domain over Netlify | Later | Registrar fees | none | Registrar + Netlify DNS | Manual when wanted |
