# QR Studio — SaaS Portal

A dynamic QR-code SaaS built with **Next.js 14 (App Router)**, **Supabase** (Postgres + Auth + RLS), and deployed on **Vercel**.

## Features
- Email/password auth (Supabase)
- 1 free QR credit per account (enforced server-side in Postgres)
- Create & save styled QR codes (URL, WiFi, UPI, vCard, text) — credit consumed atomically
- Billing: annual packages (Starter ₹999 / Growth ₹1,499 / Pro ₹2,499) + tiered addon credits (₹120 / ₹100 / ₹80)
- Pay-as-you-go reference rate ₹100/QR/month
- Analytics (scans per code) and a dynamic-QR redirect route `/r/[id]` that counts scans
- Role-gated **admin panel** (`/admin`) with users, revenue, plan distribution
- All privileged logic lives in `SECURITY DEFINER` SQL functions — no service-role key needed in the app

## Tech
- `app/` — routes (landing, login, dashboard, admin, redirect)
- `lib/` — Supabase browser/server clients + public config
- `components/QRCanvas.jsx` — client QR renderer (qrcode-generator)
- Database: tables `qr_profiles`, `qr_codes`, `qr_transactions`, `qr_plans`; functions `qr_ensure_profile`, `qr_save_code`, `qr_subscribe`, `qr_buy_addons`, `qr_track_scan`, `qr_is_admin`, `qr_claim_admin`

## Environment variables
Both are public (safe in the browser). The app ships with working defaults, so it runs with no `.env` file, but set these on Vercel to point at your own Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run locally
```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy
Already deployed to Vercel. To redeploy from GitHub: push this repo, import it in Vercel, add the two env vars, deploy.

## Make yourself admin
Sign up, then visit `/admin` and click **Claim admin (first user)** — works only while no admin exists. Or run in Supabase SQL:
```sql
update public.qr_profiles set role='admin' where email='you@email.com';
```

## Payments (Cashfree)
Subscriptions and addon purchases go through Cashfree. The browser calls `/api/cashfree/create-order`
(amount computed server-side from `qr_plans`), Cashfree's JS SDK opens checkout, and credits are
granted only after payment is confirmed — via `/api/cashfree/verify` on return and the
`/api/cashfree/webhook` callback. Fulfillment runs in `qr_fulfill_order` (idempotent, service-role only).

Set these env vars in Vercel:
- `NEXT_PUBLIC_CASHFREE_MODE` = `sandbox` | `production` (public, for the browser SDK)
- `CASHFREE_ENV` = `sandbox` | `production` (server)
- `CASHFREE_APP_ID` = Cashfree App ID (server secret)
- `CASHFREE_SECRET_KEY` = Cashfree Secret Key (server secret)
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Settings → API → service_role (server secret)

Add the webhook in the Cashfree dashboard: `https://<your-domain>/api/cashfree/webhook`.
Use Cashfree test cards in sandbox to try the full flow.

## Next steps to productionise
- Point QR content at the `/r/[id]` redirect URL to enable true dynamic editing + richer scan analytics
- Add email verification, password reset, and team/multi-seat support

---
© 2026 QR Studio. Built with Next.js, Supabase & Vercel.
