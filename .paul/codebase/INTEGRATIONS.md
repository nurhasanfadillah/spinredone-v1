# External Integrations

**Analysis Date:** 2026-06-04

## Overview

SPINER is backed primarily by **Supabase** for data, auth, and audit logging. No payment, analytics, or third-party SaaS integrations are active. A Gemini API key is configured but unused.

## External APIs & Services

### Supabase (PRIMARY backend)
- **Client init:** `supabaseClient.ts` (URL + anon key **hardcoded** — see CONCERNS.md)
- **URL:** `https://hhmwurtgqognyaocsooo.supabase.co`
- **SDK:** `@supabase/supabase-js` 2.39.3
- **Used in:** `store.tsx` (all CRUD + auth + RPC)

**Auth operations** (`store.tsx`):
- `signInWithPassword()`, `signOut()`, `updateUser()`
- `getSession()`, `onAuthStateChange()`
- Email convention: system auto-appends `@spiner.app` if no email provided
- Roles supported: `admin`, `staff`, `owner`, `guest`

**Database operations:**
- Direct CRUD: `.from(table).select()/.insert()/.update()/.delete()`
- RPC transactions: `rpc('create_spk_full')`, `rpc('update_spk_full')` — atomic multi-row writes

**Tables accessed:**
- `products`, `categories`, `finance_categories`
- `transactions` (IN/OUT financial records)
- `spks`, `spk_items`, `spk_mutations`
- `activity_logs`, `profiles`

**RLS:** Row-Level Security policies enforced (references to `auth.uid()`)

## Databases

- **Primary:** Supabase PostgreSQL — fully integrated, multi-table relational schema for production management
- **Pagination:** Client-side batching (1000-row chunks) in `store.tsx` `fetchAllData()` (lines ~92-250)

## Authentication Providers

- **Supabase Auth** (email/password) — JWT session tokens
- Session restored on app load via `supabase.auth.getSession()` in `store.tsx`
- Auth state subscribed via `onAuthStateChange()`

## Payment Integrations

- **Not detected.** The Finance module (`views/FinanceManager.tsx`) tracks internal cash flow only — no payment gateway.

## Analytics & Logging

- **Custom audit trail** — `activity_logs` table in Supabase
- Logger: `logActivity()` in `store.tsx` (lines ~48-75)
- Tracks: `action_type` (CREATE/UPDATE/DELETE/AUTH), `entity` (PRODUCT/CATEGORY/SPK/FINANCE/SYSTEM), `username`, timestamp
- Viewer: `views/ActivityLog.tsx`
- **No** Google Analytics, Sentry, PostHog, or third-party telemetry detected

## Webhooks

- Not detected — no webhook handlers in code.

## Cloud Storage

- **No object storage** (no S3, GCS, Cloudinary, Supabase Storage usage)
- External images served from `lh3.googleusercontent.com` (Google Drive-hosted logos) — `App.tsx`, `views/Dashboard.tsx`

## AI / Other

- **Gemini API** — `GEMINI_API_KEY` defined in `vite.config.ts` but no implementation in code (no imports, no fetch). Likely planned future feature. README mentions setup.

## CDN / Third-Party Assets

- **Tailwind CSS** — loaded via CDN in `index.html` (not npm package)
- **Google Fonts** — Inter font family (`fonts.googleapis.com`)
- **Google-hosted images** — logos and home button icon

## Deployment / Infrastructure

- **Vercel** — `vercel.json` for SPA rewrites, `.vercel/` linked
- **`_redirects`** — Netlify-style fallback (also present)
- **Service Worker** — `sw.js` registered in `index.html`, smart cache strategy excluding Supabase API calls

---

*Integration analysis: 2026-06-04*
