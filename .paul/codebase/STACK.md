# Technology Stack

**Analysis Date:** 2026-06-04

## Languages

**Primary:**
- TypeScript 5.8.2 - All application code (`.ts`, `.tsx` files)
- React JSX (`react-jsx` mode in `tsconfig.json`)

**Secondary:**
- JavaScript - Service worker (`sw.js`), Vite config interop
- HTML - `index.html` (inline Tailwind config + PWA meta)
- CSS - via Tailwind CDN (no local stylesheet)

## Runtime

**Environment:**
- Node.js (build/dev only) — version not pinned (no `.nvmrc`, no `engines` field in `package.json`)
- Browser runtime — SPA + PWA (service worker registered in `index.html`)
- ES2022 target (`tsconfig.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (untracked — see CONCERNS.md)

## Frameworks

**Core:**
- React 19.2.3 — UI framework (`react`, `react-dom`)
- Vite 6.2.0 — Dev server + bundler (`vite.config.ts`)
- @vitejs/plugin-react 5.0.0 — JSX compilation

**Testing:**
- None detected — no test framework, no test files (see TESTING.md)

**Build/Dev:**
- Vite 6.2.0 — dev server on `0.0.0.0:3000`, build to `dist/`
- TypeScript 5.8.2 — strict mode (`skipLibCheck: true`, `isolatedModules: true`)
- @types/node 22.14.0

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.39.3 — Database, auth, RPC (`supabaseClient.ts`, `store.tsx`)
- `zod` 3.22.4 — Form validation schemas (`utils.ts`)
- `react` 19.2.3 / `react-dom` 19.2.3 — UI runtime

**UI & Visualization:**
- `lucide-react` 0.562.0 — Icon library (used across `views/`, `components/UI.tsx`)
- `recharts` 3.6.0 — Charts in `views/Reports.tsx`

**Export/Reports:**
- `jspdf` 2.5.1 + `jspdf-autotable` 3.8.2 — PDF generation (`utils.ts`: `exportFinanceToPDF`, `exportSPKToPDF`)

**State Management:**
- React Context API (no Redux/Zustand) — `store.tsx`

## Configuration

**Environment:**
- Vite `loadEnv()` reads `.env*` files (`vite.config.ts`)
- `GEMINI_API_KEY` exposed as `process.env.GEMINI_API_KEY` and `process.env.API_KEY` — defined but unused in code
- No `.env.example` present (gap — see CONCERNS.md)
- Supabase credentials **hardcoded** in `supabaseClient.ts` (CRITICAL — see CONCERNS.md)

**Build:**
- `vite.config.ts` — dev server port 3000, React plugin, `@/*` path alias
- `tsconfig.json` — target ES2022, module ESNext, jsx react-jsx, `@/*` alias
- Tailwind config — inline in `index.html` (dark theme: primary cyan #06b6d4, accent violet)

## Platform Requirements

**Development:**
- Any OS with Node.js + npm
- `npm run dev` (Vite dev server), `npm run build`, `npm run preview`

**Production:**
- Vercel hosting (`vercel.json`, `.vercel/` directory)
- SPA routing via `vercel.json` rewrites + `_redirects` (Netlify-style)
- PWA: `manifest.json` + `sw.js` registered in `index.html`
- External CDN dependencies: Tailwind CDN, Google Fonts (Inter), Google-hosted logo images

---

*Stack analysis: 2026-06-04*
*Update after major dependency changes*
