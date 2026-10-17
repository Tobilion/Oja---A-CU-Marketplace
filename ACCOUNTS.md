# Oja — Accounts & Connected Services

Reference sheet for the live deployment: which accounts own what, and where
every setting lives. **Secrets are deliberately NOT in this file** — this repo
is public. They live in `secrets.local` in the project root, which is
gitignored (`*.local`) and never committed.

## Live site

- App: https://oja-cumarketplace.vercel.app
- Repo: https://github.com/Tobilion/Oja---A-CU-Marketplace (public)
- Hosting: Vercel, auto-deploys `main`. Build-time env vars (change requires a
  redeploy): `VITE_APP_MODE=public`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase (database + auth)

- Org: "Tobilion's team" (free plan)
- Project: Oja CU Marketplace (main, PRODUCTION)
- Project ref: `vsvcojryrnurhgwijxgv`
- Project URL: https://vsvcojryrnurhgwijxgv.supabase.co
- Dashboard: https://supabase.com/dashboard/project/vsvcojryrnurhgwijxgv
- Applied SQL: `supabase/schema.sql`, `supabase/patch-admin-policy-recursion.sql`,
  plus the Joshua Hall rename (`UPDATE public.halls SET id='hall_joshua' ...`).

### Auth — email (custom SMTP)

- Host `smtp.gmail.com`, port `587`
- SMTP username + sender email: `jaguntobi@gmail.com` (sender name "Oja")
- Password: Gmail app password, stored in `secrets.local`.
  Gmail app passwords live at myaccount.google.com/apppasswords and require
  2-Step Verification on that Google account.
- Keep "Confirm email" ON: signup sends a 6-digit code; the new user must
  verify it before their profile row is written (handled in `supabaseRepo.ts`).

### Auth — Google provider

- Enabled: Supabase → Authentication → Providers → Google.
- Google Cloud project: "Oja- CUMarketplace" — project number `769246202362`,
  project ID `oja-cumarketplace`, created under `tobilobajagun@gmail.com`.
  Console: https://console.cloud.google.com/auth/clients?project=oja-cumarketplace
- OAuth client type: Web application
  - Client ID (public): `769246202362-25m1q7e4bmh0vc9sgcrq0c53d6mkncb.apps.googleusercontent.com`
  - Client secret: stored in `secrets.local`.
  - Authorized JavaScript origin: `https://oja-cumarketplace.vercel.app`
  - Authorized redirect URI: `https://vsvcojryrnurhgwijxgv.supabase.co/auth/v1/callback`
- OAuth consent screen is still in **Testing**: only accounts listed as test
  users can sign in. Manage at
  https://console.cloud.google.com/auth/audience → Audience → Test users.
  Click "Publish app" there when ready for all students.

## App admin accounts

- Founding Super Admins (auto-promoted to `super_admin` on first verified
  sign-in by `bootstrap_admin`, see `supabase/schema.sql`):
  - `tobilobajagun@gmail.com`
  - `ejagun.2401221@stu.cu.edu.ng`
- Shared beta email sign-in password (hardcoded in `src/data/supabaseRepo.ts`):
  `OjaSchoolSecureAuth2026!`
- Google sign-in in the UI only accepts `@stu.cu.edu.ng` addresses, so the CU
  account above can use "Sign in with CU School Account"; Gmail admins use the
  email sign-in form.
- To create an admin: sign up on the live site with that email, enter the
  emailed 6-digit code, and the profile is promoted automatically. Alternative:
  Supabase → Authentication → Users → Add user (auto-confirm) → sign in on site.

## Account ownership summary

| Service | Created/owned under |
|---|---|
| GitHub repo, Vercel, Supabase org | `tobilobajagun@gmail.com` |
| Google Cloud project + OAuth client | `tobilobajagun@gmail.com` |
| SMTP sender + Gmail app password | `jaguntobi@gmail.com` (project Gmail) |

## Known security notes (beta)

- Every account signs in with the same hardcoded beta password, which is
  visible in this public repo. Anyone who knows a registered email can sign in
  as that user. Replace with emailed-code sign-in before real launch.
- `secrets.local` must stay out of git. If a secret leaks, rotate it
  (Gmail app password: Google Account → Security; OAuth secret: Google Cloud →
  Clients → reset, then update Supabase → Providers → Google).
