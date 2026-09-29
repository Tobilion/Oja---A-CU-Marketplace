# Oja PRIVACY — student data and the Nigeria Data Protection Act (NDPA)

This note describes what is stored today and what a deletion flow must do.
It is not legal advice; get a proper review before real-money launch.

## What student data is stored

- Identity: full name, personal email, school email (`@stu.cu.edu.ng`),
  unique `@username`, gender, Telegram handle (required at sign-up).
- Residence: hall (admin-editable list) and room number.
- Optional: matric number, reg number, bio, avatar.
- Seller data: bank name, account number, account name; seller application
  status and dates; ratings and review history.
- Commerce data: cart contents, orders with delivery halls/rooms, payment
  references and sender account names, transfer amounts, payout records,
  late-penalty deductions, chat messages (including order references),
  reports, audit-log entries naming admins and targets, feedback reports
  with breadcrumbs and the last JS error.
- Exposure control (M-02): the `public_profiles` view exposes only safe
  fields. Room number, matric/reg numbers, personal and school emails, and
  bank details are restricted to the owner and authorised admins by RLS,
  mirrored in `supabaseRepo` (view fallback) and the mock allowlist.

## Lawful basis and consent (to confirm with counsel)

Demo and beta participation should present a short consent notice at sign-up
covering: what is collected, escrow/payment handling, admin moderation
(including reported-chat reads), and the 30-day recycle-bin purge. Log the
consent timestamp per user (no such column exists yet; add
`profiles.consent_at` before step C).

## What a deletion flow would need

1. A `profiles.deleted_at` soft-delete plus hard-delete procedure that
   cascades or anonymises: listings (or transfer to recycle bin), orders
   older than the financial record-keeping window, chat messages (replace
   content with `[deleted]` but keep thread integrity for the other party),
   reviews (keep aggregate honesty: anonymise reviewer, keep rating),
   notifications, feedback entries, and audit-log personal identifiers.
2. Financial/tax records that must be retained anyway: define the retention
   window (escrow payouts, refunds, penalties) and exclude exactly those
   rows from hard deletion, with the reason recorded.
3. Supabase Auth user deletion alongside the profile row, plus Storage
   object removal for that user's listing photos.
4. Backups: document the backup retention window during which a deleted
   record may still exist, and the process for honouring that.
5. A self-serve "Delete my account" entry point (Settings or profile) that
   opens the flow, plus an admin runbook for manual requests today.

## Data handling rules already in the codebase

- Money and payout data never leaves the repository layer except to the
  signed-in owner, their counterparty's minimum (name/hall/delivery mode),
  or an authorised admin queue.
- Feedback auto-capture excludes passwords and personal data beyond the
  persona name and an optional contact (`src/utils/feedback.ts`).
- No analytics, no third-party trackers, no advertising SDKs. Images are
  local seed SVG or user uploads, never third-party hotlinks.
