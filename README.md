# Oja — Covenant University Campus Marketplace

> "Campus trade, kept honest."

Oja is a verified student marketplace for Covenant University, Nigeria:
escrow-protected payments, verified sellers, business storefronts, and
hall-to-hall room delivery by vetted student agents. All money is in
integer naira. Brand is ASCII "Oja" everywhere.

## Run the demo (no configuration)

```powershell
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoExit -Command "& 'C:\Users\tobil\Desktop\Projects\Oja\node_modules\.bin\vite' --port=3000"
```

Or the normal way (first install needs the peer-deps flag, see below):

```powershell
npm install --legacy-peer-deps
npm run dev
```

Unset `VITE_APP_MODE` (or `demo`) runs the offline mock database: 32 users,
6 businesses, 103 listings, orders in every state, persona bar, demo banner,
Reset demo data, and a local feedback queue. Nothing leaves the machine.

Public (live) mode is a strict opt-in: `VITE_APP_MODE=public` plus
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without credentials the app
halts on the Database Configuration error screen; it never silently uses
mock data. See `GO_LIVE.md` for the four steps to production.

## Run checks and tests

```powershell
npm run lint
Get-ChildItem -Recurse src -Filter *.test.ts | ForEach-Object { npx tsx $_.FullName }
npm run build
```

13 suites run that way: `deliveryFee`, `transitions`, `logout`,
`listQuery`, `listingPhotos`, `adminGuards`, `seedCoverage`, `phone`,
`orbitMath`, `paths`, `safeNext`, `access`, `authReturn` (each file also
runs standalone with `npx tsx <file>`).

With `VITE_APP_MODE=public` set, `npm run build` also verifies the public
bundle compiles (runtime still needs Supabase credentials).

## Project structure

- `src/pages/` — full-screen views reached by URL: public `ListingPage`,
  `ProfilePage`, `StorePage`, `LoginPage`; transactional `OrdersPage`,
  `OrderDetailPage`, `CheckoutPage`, `MessagesPage`; seller/agent/admin
  `SellPage`, `SellerApplyPage`, `SellerPortalPage`, `RecycleBinPage`,
  `RegisterBusinessPage`, `AgentPortalPage`, `AdminPage`; plus
  `ForbiddenPage` and `NotFoundPage`.
- `src/routes/` — routing core: `paths` (URL builders + patterns),
  `safeNext` (open-redirect guard), `access` + `guards` (role gates),
  `AppRoutes` (route table with lazy chunks), `useSmartBack`, `authReturn`
  (OAuth deep-link stash), plus the route test files.
- `src/components/` — reusable UI: `auth/`, `cart/` (CartDrawer),
  `chat/` (ThreadList, ThreadView), `common/` (ListControls,
  ListingImagePlaceholder, RouteFallback), `feedback/`, `landing/`,
  `layout/` (Navbar, Footer, TrustStrip), `marketplace/` (home, search,
  filters, cards, ReviewModal), `notifications/` (drawer).
- `src/data/` — swappable repository: `repo.ts` (interface), `mockRepo.ts`
  (localStorage demo), `supabaseRepo.ts` (live), `mockStorage.ts`,
  `seedUsers.ts`, `seedListings.ts`, `seedOrders.ts`, `seedExtra.ts`
  (deterministic expansion behind `SEED_VERSION`), plus `*.test.ts`.
- `src/utils/` — pure, tested logic: `deliveryFee`, `transitions`
  (order state machine), `money`, `formatHall`, `listQuery` (shared
  search/sort/pagination), `listingPhotos`, `adminGuards`, `feedback`,
  `search` (Fuse + synonyms), `taxonomy`, `imageCompress`, `halls`.
- `src/hooks/` — `useModalEscape` (Escape/scroll-lock/focus-trap for
  overlays), `useListQuery`, `useScrollRestoration`, `useDocumentTitle`.
- `src/context/` — Auth, Cart, Notifications, Theme.
- `src/config/appConfig.ts` — mode flag, product constants
  (`REQUIRE_LISTING_PHOTOS = false`, 48h auto-confirm, penalty defaults,
  founding admins, feedback contacts).
- `supabase/schema.sql` — full live schema: tables, RLS, triggers, RPCs,
  `pg_cron` sweeps, seeds. Read-only reviewed; run per `GO_LIVE.md`.
- `public/seed/` — generated local SVG artwork (avatars, categories, logos,
  banners, proofs). Placeholders by declaration, never hotlinks.
- Docs: `GO_LIVE.md`, `INTEGRATIONS.md`, `PRIVACY.md`, `features.md`.

## Routes (deep-linkable)

| URL | View | Access |
|---|---|---|
| `/` | Marketplace home (`#explore` scrolls to the listings grid) | public |
| `/listing/:id` | Listing detail | public |
| `/store/:id` | Business storefront | public |
| `/profile/:username` | Public seller profile | public |
| `/orders`, `/orders/:id` | Order list / tracker | signed in |
| `/checkout` | Checkout | signed in |
| `/messages`, `/messages/:threadId` | Chat | signed in |
| `/sell` | Create a listing | seller |
| `/business/register` | Register a business | signed in |
| `/seller/apply` | Seller application | signed in |
| `/seller` | Seller portal | seller |
| `/seller/recycle-bin` | Recycle bin | seller |
| `/agent` | Delivery agent portal | agent |
| `/admin`, `/admin/:tab` | Admin console | admin |
| `/login` | Sign in / sign up | public |
| any other path | Not-found page | public |

Guests who open a gated URL are sent to `/login?next=<path>` and returned
there after signing in (Google OAuth included); signed-in users without the
required role get the 403 page.

## Key product rules (decided)

- Delivery fee per seller sub-order: N500 if subtotal under N10,000 AND
  under 5 items, else N1,000; same-hall sellers split 50% off; pickup is N0.
- Order states form one validated machine (`transitions.ts` + SQL mirror);
  illegal transitions and wrong-actor actions are rejected in both modes.
- Late sellers lose 5% per day (N200 daily floor, 50% cap, admin-editable
  setting); buyers are credited; admins are alerted at 2 days.
- Completed orders auto-confirm 48h after delivery; recycle bin purges at
  30 days.
- Agents have no earnings model: counts and ratings only (open question).
