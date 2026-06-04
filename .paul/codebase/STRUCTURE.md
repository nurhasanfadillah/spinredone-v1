# Directory Structure

**Analysis Date:** 2026-06-04

## Top-Level Layout

```
spinredone-v1/
├── index.tsx              # React entry (mounts <App />)
├── index.html             # PWA shell, inline Tailwind config, SW registration
├── App.tsx                # Root layout: Navigation + MainContent switch
├── store.tsx              # AppContext + AppProvider + useAppStore (~777 lines)
├── types.ts               # Interfaces, enums (User, Product, SPK, Transaction, ActivityLog)
├── utils.ts               # Zod schemas, formatters, PDF/CSV export, haptics (~571 lines)
├── supabaseClient.ts      # Supabase client init (hardcoded creds — see CONCERNS.md)
│
├── components/
│   └── UI.tsx             # All UI primitives: Card, Button, Input, Select,
│                          # SwipeableCard, BottomSheet, Badge, ConfirmationModal,
│                          # ToastContainer (~525 lines)
│
├── views/                 # Page-level components (one per feature)
│   ├── Dashboard.tsx      # KPIs, auth modal, active SPK summary
│   ├── SPKManager.tsx     # SPKList + SPKForm + SPKDetailView + Mutation form (~970 lines)
│   ├── ProductMaster.tsx  # Product CRUD + category mgmt
│   ├── FinanceManager.tsx # Cash flow / transaction CRUD
│   ├── Reports.tsx        # Recharts dashboards + PDF export
│   └── ActivityLog.tsx    # Audit trail viewer
│
├── vite.config.ts         # Dev server :3000, React plugin, @/* alias, env passthrough
├── tsconfig.json          # ES2022, ESNext modules, react-jsx, strict checks
├── package.json           # Deps: react 19, supabase, zod, jspdf, recharts, lucide
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker (offline caching)
├── vercel.json            # SPA rewrites for Vercel
├── _redirects             # SPA fallback (Netlify-style)
└── dist/                  # Build output (gitignored)
```

## Directory Purposes

| Path | Purpose |
|------|---------|
| `/` (root) | Config, root component, global modules (store, types, utils) |
| `components/` | Reusable UI primitives — currently all in one file `UI.tsx` |
| `views/` | Feature-level pages, each consumes `useAppStore()` |
| `dist/` | Vite build output |

## Key Locations

**Routing & navigation:**
- `App.tsx` — MainContent switch (~lines 93-115), NavItems definition (~lines 21-27)
- `store.tsx` — `navigate()` function (~line 714), `currentView` state

**UI primitives:**
- `components/UI.tsx` — all reusable components in a single file

**Data layer:**
- `supabaseClient.ts` — client init (9 lines)
- `store.tsx` — `fetchAllData()` (~92-250), `login()` (~313-338), `addSPK()` (~407-520), `addMutation()` (~582-620)

**Domain types:**
- `types.ts` — entire type system in one file (~158 lines)

**Validation & utilities:**
- `utils.ts` — Zod schemas (~1-100), `exportFinanceToPDF` (~102-268), `exportSPKToPDF` (~270+)

**Configuration:**
- `index.html` — inline Tailwind theme (~lines 22-79)
- `vite.config.ts` — dev server + env passthrough

**PWA assets:**
- `manifest.json` — app name "SPINER", icons
- `sw.js` — caching strategy (excludes Supabase API calls)

## Organization Style

**Type-based, not feature-based.**

- All views grouped under `views/` (each view is one feature)
- All UI primitives in a single `components/UI.tsx` file
- Single global store (`store.tsx`) with every CRUD operation
- Single utils file with all formatters/validators/exports

**Trade-off:** simple to navigate at this size, but `store.tsx`, `utils.ts`, and `views/SPKManager.tsx` are growing large — see CONCERNS.md for split recommendations.

## Naming Conventions

- **Components:** PascalCase files (`Dashboard.tsx`, `SPKManager.tsx`)
- **Non-component modules:** camelCase (`store.tsx`, `utils.ts`, `supabaseClient.ts`)
- **View state enum values:** UPPER_SNAKE_CASE (`SPK_LIST`, `SPK_FORM`)
- **Hooks:** `use*` prefix (`useAppStore()`)
- **Path alias:** `@/*` → project root (`tsconfig.json`, `vite.config.ts`)

## Module Boundaries

1. UI primitives sealed — no business logic in `components/UI.tsx`
2. Views consume store only — no direct Supabase calls
3. Store owns all DB I/O — single Supabase boundary
4. Validation in `utils.ts` — views catch and surface via notification

---

*Structure analysis: 2026-06-04*
