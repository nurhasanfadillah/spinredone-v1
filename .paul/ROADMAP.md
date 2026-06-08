# Roadmap: SPINER

## Overview

SPINER dimulai dari MVP yang sudah berjalan — 6 fitur inti sudah ada. Roadmap ke depan berfokus pada hardening (security + stability), refactoring untuk maintainability, lalu feature growth. Milestone v0.1 menyelesaikan technical debt kritis sebelum scaling.

## Current Milestone

**v0.1 Hardening & Stability** (v0.1.0)
Status: Not started
Phases: 0 of 4 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Security & Critical Fixes | TBD | Not started | - |
| 2 | Code Refactor | TBD | Not started | - |
| 3 | Testing & Quality | TBD | Not started | - |
| 4 | Feature Enhancement | TBD | Not started | - |

## Phase Details

### Phase 1: Security & Critical Fixes

**Goal:** Hilangkan semua CRITICAL dan HIGH issues dari CONCERNS.md — aplikasi aman dan tidak ada silent data corruption
**Depends on:** Nothing (first phase)
**Research:** Unlikely (perbaikan yang sudah diidentifikasi jelas)

**Scope:**
- Migrasi Supabase credentials ke `.env.local` + rotasi anon key
- Hapus `password` dari `User` interface/global state
- Tambah error handling di semua Supabase mutations (`store.tsx`)
- Fix unhandled promise di `auth.getSession()`
- Validasi RPC response dengan Zod schema

**Plans:**
- [ ] 01-01: Migrasi environment variables dan security fixes
- [ ] 01-02: Error handling komprehensif di store mutations

### Phase 2: Code Refactor

**Goal:** Tidak ada file > 500 baris; setiap modul punya tanggung jawab tunggal yang jelas
**Depends on:** Phase 1 (baseline stabil sebelum refactor)
**Research:** Unlikely (pattern split sudah jelas dari analisis)

**Scope:**
- Split `store.tsx` → service modules per entity (`spkService.ts`, `financeService.ts`, dll.)
- Split `views/SPKManager.tsx` → 4 komponen terpisah di `views/spk/`
- Split `components/UI.tsx` → satu file per komponen
- Extract `usePagination<T>()` hook (duplikasi di 3 views)
- Extract `filterByDateRange()` dan `mapZodErrors()` ke `utils.ts`

**Plans:**
- [ ] 02-01: Refactor store → service layer
- [ ] 02-02: Split SPKManager dan UI components
- [ ] 02-03: Extract shared hooks dan utilities

### Phase 3: Testing & Quality

**Goal:** Safety net testing ada; linter aktif; tidak ada regresi silent
**Depends on:** Phase 2 (struktur stabil sebelum ditulis test)
**Research:** Likely (pilihan test framework untuk React 19 + Vite perlu dievaluasi)
**Research topics:** Vitest vs Jest untuk Vite; testing strategy untuk Context API; E2E dengan Playwright atau Cypress

**Scope:**
- Setup ESLint + Prettier
- Setup Vitest + React Testing Library
- Unit tests untuk `utils.ts` (formatters, Zod schemas, PDF export)
- Integration tests untuk store mutations kritis (SPK flow)
- CI pipeline dasar (GitHub Actions)

**Plans:**
- [ ] 03-01: Setup tooling (ESLint, Prettier, Vitest)
- [ ] 03-02: Unit tests utils dan komponen
- [ ] 03-03: Integration tests store + CI pipeline

### Phase 4: Feature Enhancement

**Goal:** Fitur baru yang sudah direncanakan — Gemini AI, UX improvements, performance
**Depends on:** Phase 3 (test coverage memproteksi feature baru)
**Research:** Likely (Gemini API integration pattern, cursor-based pagination di Supabase)
**Research topics:** Gemini API untuk apa use case spesifik; cursor pagination Supabase; self-hosting Tailwind

**Scope:**
- Implementasi Gemini AI (use case TBD saat planning)
- Migrasi Tailwind dari CDN ke npm (build-time)
- Self-host font dan logo (hapus CDN dependencies)
- Cursor-based pagination di Supabase (ganti 1000-row batching)
- Tambah `useMemo` pada render berat di SPKManager

**Plans:**
- [ ] 04-01: Gemini AI integration
- [ ] 04-02: Performance & dependency hardening

---
*Roadmap created: 2026-06-08*
*Last updated: 2026-06-08*
