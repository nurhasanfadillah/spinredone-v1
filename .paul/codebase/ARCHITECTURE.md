# Architecture

**Analysis Date:** 2026-06-04

## Pattern Overview

**Single Page Application (SPA)** with React 19 + Context API, backed by Supabase.

- Client-side rendering (Vite bundle)
- Mobile-first PWA (service worker + manifest)
- Context-based view routing (no URL router; no React Router)
- Real-time-ish data sync via `fetchAllData()` after every mutation
- Atomic multi-row writes via Supabase RPC functions

## Layers

1. **Entry** — `index.tsx` (React mount), `index.html` (PWA shell + Tailwind inline config)
2. **Layout/App** — `App.tsx` (top-level Navigation + MainContent switch)
3. **Views (pages)** — `views/Dashboard.tsx`, `views/SPKManager.tsx`, `views/ProductMaster.tsx`, `views/FinanceManager.tsx`, `views/Reports.tsx`, `views/ActivityLog.tsx`
4. **UI primitives** — `components/UI.tsx` (Card, Button, Input, Select, SwipeableCard, BottomSheet, Badge, ConfirmationModal, ToastContainer)
5. **State management** — `store.tsx` (AppContext, AppProvider, `useAppStore` hook)
6. **Data access** — `supabaseClient.ts` + all Supabase calls in `store.tsx`
7. **Domain utilities** — `utils.ts` (Zod schemas, formatters, PDF/CSV export, haptics)
8. **Types** — `types.ts` (interfaces, enums, AppContextType)

## Data Flow Example: Create SPK

```
SPKForm (views/SPKManager.tsx)
  → Zod validate (SPKHeaderSchema + SPKItemSchema from utils.ts)
  → useAppStore().addSPK(spk)         [store.tsx]
  → supabase.rpc('create_spk_full')   [atomic insert spks + spk_items]
  → logActivity('CREATE', 'SPK', ...) [activity_logs table]
  → showNotification('success')
  → fetchAllData()                    [refresh all entities]
  → navigate('SPK_LIST')              [currentView state update]
  → Components re-render via useAppStore()
```

## Key Abstractions

- **`useAppStore()` hook** — single source of truth for app state and mutations (`store.tsx`)
- **`SwipeableCard`** — mobile gesture handler (left-swipe reveals edit/delete) — `components/UI.tsx`
- **`BottomSheet`** — modal-like form container, native mobile feel — `components/UI.tsx`
- **Context navigation** — `ViewState` enum + `navigate(view)` (no URL routing) — `store.tsx`, consumed in `App.tsx`
- **RPC transaction pattern** — `create_spk_full`, `update_spk_full` ensure multi-table atomicity (`store.tsx` ~lines 407-560)
- **Denormalized history** — `SPKMutation` and `SPKDetail` snapshot `product_name` and `cmt_price` for audit accuracy
- **Pagination batching** — 1000-row chunked fetch loops in `fetchAllData()` (`store.tsx`)
- **Activity audit** — every CREATE/UPDATE/DELETE calls `logActivity()`

## Entry Points

- **`index.tsx`** — React root; mounts `<App />` into `#root`
- **`App.tsx`** — wraps in `AppProvider`; renders Navigation + MainContent switch (lines ~93-115)
- **`store.tsx` `AppProvider`** — initializes Supabase session, hydrates all data on mount
- **`sw.js`** — service worker, registered from `index.html`

## Routing Approach

**Context-based view state** (no URL routing, no React Router):

- `currentView: ViewState` lives in `store.tsx`
- `ViewState` enum values: `DASHBOARD | SPK_LIST | SPK_FORM | SPK_DETAIL | PRODUCTS | FINANCE | REPORTS | ACTIVITY_LOG`
- `MainContent` switch in `App.tsx` renders the matching view component
- `Navigation` (bottom bar) calls `navigate(view)` to update state
- `navigate()` also scrolls to top

**Implication:** no deep linking, no browser back-button history, no route guards beyond `isAuthenticated` checks in views.

## Module Boundaries

- UI components (`components/UI.tsx`) — no business logic, pure presentation
- Views — consume store via `useAppStore()`, never call Supabase directly
- Store — single Supabase boundary; all DB writes go through here
- Validation — Zod schemas in `utils.ts`; views catch errors and surface via `showNotification()`

---

*Architecture analysis: 2026-06-04*
