# Oja FEATURES MAP (current state)

| Feature | Owning files | Status | Note |
|---|---|---|---|
| Data layer + no-silent-mock | `src/data/index.ts`, `repo.ts`, `mockRepo.ts`, `supabaseRepo.ts` | Stable | Public mode without creds halts on error screen; stub throws |
| SQL schema, RLS, triggers, RPCs | `supabase/schema.sql` (§1–12) | Partial | Read-only reviewed, never executed live; needs staging run |
| Fee engine + parity | `utils/deliveryFee.ts`, `schema.sql` place_order | Stable | 12/12 tests; SQL mirrors TS incl. hall discount |
| State machine + guards | `utils/transitions.ts`, `utils/adminGuards.ts`, mock + SQL | Stable | 29 + 6 tests; enforced both modes |
| Auth + school-email server hook | `AuthContext.tsx`, `AuthModal.tsx`, schema §8.13 | Partial | Hook is a manual dashboard step; client checks are UX only |
| Profiles + public view | `ProfileModal.tsx`, `supabaseRepo` view fallback, `public_profiles` | Stable | Privates restricted; mock allowlist enforced |
| Logout + guest view | `Navbar.tsx`, `AuthContext.tsx`, `mockStorage.ts`, `App.tsx`, `logout.test.ts` | Stable | 7/7 tests; cross-tab sync; cart cleared |
| Seller portal | `components/seller/SellerPortalModal.tsx` | Stable | Overview, accept/reject, progress, payouts, bank edit; read-only reviewed in browser |
| Agent portal + board | `components/delivery/AgentPortalModal.tsx`, `available_deliveries` RPC | Stable | Claim atomicity enforced; defer is session-local |
| Buyer tracker | `components/orders/OrderDetailModal.tsx`, `CartDrawer.tsx` | Stable | Cancel/dispute/confirm, code timing, holder, expected date |
| Admin role portals | `components/admin/AdminDashboard.tsx` | Stable | Super/moderator/payments/logistics gates + preview switcher; deliveries + agents tabs |
| Users + roles + audit | `adminUpdateUser` (repos, trigger, RLS), Users tab | Stable | Self/last/founding guards; before-after audit |
| Shared list engine | `utils/listQuery.ts`, `hooks/useListQuery.ts`, `common/ListControls.tsx` | Stable | 5/5 tests; all admin + portal lists |
| Modal behavior | `hooks/useModalEscape.ts` | Stable | Escape, scroll lock, focus trap on all 15 overlays |
| Listings + photos optional | `listings/CreateListingModal.tsx`, `utils/listingPhotos.ts`, `ListingImagePlaceholder` | Stable | 4/4 photo tests; hotlinks removed |
| Image compression + quota UX | `utils/imageCompress.ts`, `mockStorage.ts`, `NotificationContext.tsx` | Partial | Compress wired on upload; quota toast added; storage still base64 data URLs in demo |
| Businesses + membership | `business/*`, repos, admin transfer queue | Stable | Join/approve/block/transfer-request/admin-approve; no edit-listing UI exists |
| Recycle bin + 30d purge | `seller/RecycleBinModal.tsx`, sweeps | Stable | Restore/delete; purge via sweep/pg_cron |
| Reviews + agent ratings | `marketplace/ReviewModal.tsx`, review trigger | Stable | Completed-order gating; agent aggregate shares profile fields |
| Chat + order refs + block | `chat/ChatDrawer.tsx` | Partial | Threads/requests/block/order cards; agent Accept/Defer lives in chat message flow, unverified end-to-end |
| Notifications + outbox | `NotificationContext.tsx`, mock outbox | Partial | In-app + dev outbox; no SMTP/edge wired (manual step) |
| Email (SMTP/edge) | — | Planned | Manual Supabase SMTP step in GO_LIVE; no edge function shipped |
| Feedback + queue | `feedback/FeedbackModal.tsx`, `utils/feedback.ts`, `feedback` table, admin Feedback tab | Stable | WhatsApp/mailto/copy + saved queue; triage new/seen/fixed |
| Landing hero (orbit + live chat) | `landing/OrbitAvatars.tsx`, `landing/ChatSimulation.tsx`, `landing/PhoneMockup.tsx`, `hooks/useOrbit.ts`, `data/heroAvatars.ts`, `data/heroChatScript.ts`, `marketplace/MarketplaceHome.tsx` | Stable | Two-col desktop (text left, phone+orbit right), 13 avatars on 3 depth lanes (inner 40s, mid 48s, outer 56s, even per-lane phases so formations hold), 10 on tablet with smaller phone, mobile row; chat scenes loop with typing indicator, cards, highlight sync; hover never freezes (parallax only); reduced-motion static |
| Demo data + reset | `data/seed*.ts`, `SEED_VERSION`, Navbar reset | Stable | 9/9 coverage tests; 32/6/103; reset control in demo bar |
| Seed artwork | `public/seed/*.svg` | Stable | Generated placeholders, no hotlinks; real photos later |
| Footer + contact | `layout/Footer.tsx` | Stable | Full demo credit; slim public line |
| Mode switch | `config/appConfig.ts` | Stable | Demo default; public strict; both builds compile |
| Brand "Oja" | UI + README | Stable | ASCII everywhere in code; docs use Oja |
| Halls/categories admin | AdminDashboard halls tab, `utils/halls.ts`, `taxonomy.ts` | Stable | Add halls; edit categories not exposed in UI (repo supports) |
| Theme + Yoruba skin | `ThemeContext.tsx`, `index.css` | Stable | Persisted; contrast not instrumentally verified |
| Search + filters | `marketplace/SearchBar.tsx`, `FilterBar.tsx`, `utils/search.ts` | Stable | Fuse + synonyms + chips; Postgres FTS later |
| Checkout + fee breakdown | `checkout/CheckoutModal.tsx`, `CartContext.tsx` | Stable | 3 modes, double-submit guard, Pay-seller-direct ack |
| Payouts queue | AdminDashboard payouts, `markSellerPayoutPaid` | Partial | Manual marking; schedule/method OPEN; no gateway |
| Late penalties + alerts | `calculateLatePenalty`, sweeps, admin Late tab | Stable | Parity tested; alerts via notifications/pg_cron |
| Auto-confirm + purge jobs | `runScheduledSweeps`, schema §10 | Partial | Mock runs on start/5min; pg_cron needs enabling + live run |
| Delivery promise extension | `extend_delivery_promise` RPC + Deliveries tab | Stable | Logistics/super only; buyer notified |
| Agent assignment filter | Deliveries tab select + RPC eligibility | Stable | Hall-gender filtered both modes |
| Audit log | `audit_logs`, admin Audit tab | Stable | Append-only; all admin actions logged |
