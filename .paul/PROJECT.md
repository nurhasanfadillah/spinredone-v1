# SPINER

## What This Is

SPINER adalah aplikasi manajemen operasional berbasis PWA (Progressive Web App) yang dirancang mobile-first untuk bisnis produksi/kontraktor. Aplikasi ini mengintegrasikan manajemen SPK (Surat Perintah Kerja / work order), inventori produk, dan pencatatan keuangan dalam satu platform dengan audit trail lengkap. Berjalan di browser sebagai PWA dengan dukungan offline melalui service worker.

## Core Value

Tim operasional dapat membuat, melacak, dan menyelesaikan SPK beserta mutasi produk dan pencatatan keuangan dalam satu aplikasi mobile-first — menggantikan pencatatan manual yang tersebar.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.0.0 |
| Status | MVP — aktif dikembangkan |
| Last Updated | 2026-06-08 |

**Production URLs:**
- Vercel: dikonfigurasi via `vercel.json` + `.vercel/`

## Requirements

### Core Features

- **SPK Management** — buat, edit, pantau, dan selesaikan work order; setiap SPK memiliki items dan mutasi (perubahan kuantitas)
- **Master Produk** — CRUD produk dan kategori, digunakan sebagai referensi item SPK
- **Keuangan** — pencatatan transaksi masuk/keluar (cash flow) per kategori keuangan
- **Laporan** — dashboard chart (Recharts) + export PDF via jsPDF; filter per rentang tanggal
- **Activity Log** — audit trail lengkap setiap operasi CREATE/UPDATE/DELETE/AUTH
- **Dashboard** — KPI overview dan ringkasan SPK aktif

### Validated (Shipped)

- [x] Autentikasi email/password via Supabase Auth — v0.0.0
- [x] SPK CRUD dengan RPC atomic (`create_spk_full`, `update_spk_full`) — v0.0.0
- [x] Master produk dan kategori — v0.0.0
- [x] Finance manager (transaksi IN/OUT) — v0.0.0
- [x] Laporan dengan chart dan export PDF — v0.0.0
- [x] Activity log viewer — v0.0.0
- [x] PWA (service worker + manifest) — v0.0.0

### Active (In Progress)

Tidak ada yang sedang aktif dikerjakan saat init.

### Planned (Next)

- [ ] Migrasi Supabase credentials ke environment variables
- [ ] Perbaikan error handling di seluruh mutation flow
- [ ] Refactor `store.tsx` dan `SPKManager.tsx` yang terlalu besar
- [ ] Infrastruktur testing (ESLint, Vitest)
- [ ] Integrasi Gemini AI (key sudah dikonfigurasi, belum diimplementasi)

### Out of Scope

- Payment gateway — FinanceManager hanya untuk cash flow internal
- URL-based routing / deep linking — menggunakan ViewState enum (desain sadar)
- Multi-tenant — sistem single-team berbasis Supabase RLS per user

## Target Users

**Primary:** Tim operasional bisnis produksi/kontraktor (admin, staff, owner)
- Bekerja dari perangkat mobile (aplikasi mobile-first)
- Perlu mencatat dan memantau SPK secara real-time
- Membutuhkan laporan keuangan dan operasional sederhana

**Secondary:** Owner/manager yang memantau progress dan laporan

## Constraints

### Technical Constraints

- Supabase credentials **hardcoded** di `supabaseClient.ts` — CRITICAL, harus dimigrasi ke `.env`
- Tailwind CSS dari CDN (bukan npm) — rentan jika CDN tidak tersedia
- Context-based routing (tidak ada URL routing) — tidak mendukung deep linking atau browser back
- Tidak ada test infrastructure (zero tests, no linter)
- Batching data 1000-row manual di `fetchAllData()` — bottleneck jika data besar
- `store.tsx` 777 baris, `SPKManager.tsx` 970 baris — maintainability debt

### Business Constraints

- Tidak ada timeline/deadline yang terdeteksi dari kode
- Single developer (inferred dari ukuran codebase dan tidak adanya CI)

### Compliance Constraints

- Password disimpan di React state global (`User` interface) — harus diperbaiki
- RLS Supabase aktif — perlu diverifikasi cakupannya setelah rotasi credentials

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| React 19 + Context API (no Redux/Zustand) | Simplicity untuk team kecil | 2026-06-04 | Active |
| Supabase sebagai full backend (DB + Auth + RPC) | Kecepatan development, built-in auth, RLS | 2026-06-04 | Active |
| PWA mobile-first (no React Native) | Satu codebase untuk semua perangkat | 2026-06-04 | Active |
| ViewState enum (no URL router) | Simplicity, desain sadar trade-off deep linking | 2026-06-04 | Active |
| Vercel untuk hosting | SPA routing mudah via `vercel.json` | 2026-06-04 | Active |
| Atomic writes via Supabase RPC | Konsistensi multi-table (spks + spk_items) | 2026-06-04 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Zero critical security issues | 0 | 2 (hardcoded creds, password in state) | At risk |
| Error handling coverage | 100% mutations | ~40% | At risk |
| Codebase maintainability | No file > 500 lines | 3 files > 500 lines | At risk |
| Test coverage | >60% | 0% | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React 19.2.3 | UI framework |
| Language | TypeScript 5.8.2 | strict mode, ES2022 target |
| Build | Vite 6.2.0 | dev server port 3000, `@/*` alias |
| Styling | Tailwind CSS (CDN) | inline config di `index.html`, dark theme cyan/violet |
| State | React Context API | `store.tsx` — `useAppStore()` hook |
| Database | Supabase PostgreSQL | RLS aktif, RPC untuk atomic writes |
| Auth | Supabase Auth | email/password, JWT session |
| Icons | Lucide React 0.562.0 | digunakan di semua views |
| Charts | Recharts 3.6.0 | `views/Reports.tsx` |
| PDF Export | jsPDF 2.5.1 + jspdf-autotable | `utils.ts` |
| Validation | Zod 3.22.4 | form schemas di `utils.ts` |
| Hosting | Vercel | SPA rewrites via `vercel.json` |
| PWA | Service Worker + manifest.json | offline caching, app name "SPINER" |
| AI (planned) | Gemini API | key dikonfigurasi, belum diimplementasi |

## Links

| Resource | URL |
|----------|-----|
| Repository | spinredone-v1 (lokal) |
| Supabase Project | https://hhmwurtgqognyaocsooo.supabase.co |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-06-08*
