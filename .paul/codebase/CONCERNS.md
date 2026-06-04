# Concerns

**Analysis Date:** 2026-06-04

> Concerns are grouped by category and severity. Each item lists actionable file paths.
> **CRITICAL** = immediate security/data risk. **HIGH** = blocking quality issue. **MED** = important debt. **LOW** = nice-to-have.

---

## CRITICAL — Security

### 1. Hardcoded Supabase credentials committed to source
- `supabaseClient.ts` — `SUPABASE_URL` and anon `SUPABASE_KEY` are hardcoded
- The anon key is exposed in version history regardless of any future fix
- **Action:** Rotate the anon key in Supabase, move to `.env.local`, read via `import.meta.env.VITE_SUPABASE_*`. Verify RLS policies are restrictive enough to make exposed anon keys safe (they should be — but rotation is still required because exposure breaks the implicit trust boundary).

### 2. Password stored in User state object
- `types.ts` — `User` interface includes `password: string`
- Even if "form-state only," storing password in React state is unnecessary attack surface (visible in React DevTools, accidentally loggable)
- **Action:** Keep password in local form state only; never on the global `User` entity.

---

## HIGH — Error Handling

### 3. Supabase mutations without error capture
Multiple `await supabase.from(...).update(...)` / `.insert()` / `.delete()` calls do not destructure or check `error`:
- `store.tsx` lines ~389, ~472 — silent update failures
- `store.tsx` lines ~601, ~623-640, ~654-655 — transaction insert/update/delete in mutation flow
- Silent failure can leave DB inconsistent (e.g., SPK item updated but transaction never recorded)
- **Action:** Always destructure `{ error }` and throw / surface via `showNotification('error')`.

### 4. Unhandled promise in initial auth fetch
- `store.tsx` lines ~283-289 — `supabase.auth.getSession().then(...)` has no `.catch()`
- Failed session restore on app load is silent
- **Action:** Add `.catch()` or refactor to `await` inside `try/catch`.

### 5. RPC response data not validated
- `store.tsx` lines ~503-514, ~546-558 — `create_spk_full` / `update_spk_full` responses used directly without shape check
- **Action:** Validate RPC return with a Zod schema before assigning to state.

### 6. `catch (e: any)` everywhere
- `store.tsx` lines ~87, ~242, ~334, ~516, ~559, ~616, ~647, ~660
- Defeats TypeScript's narrowing benefit
- **Action:** Use `catch (e)` (default `unknown`) and narrow with `instanceof Error` / `e.message`.

### 7. Network/permission/validation errors treated identically
- `store.tsx` `mapAuthError()` (~lines 306-310) only handles auth-specific errors
- Other operations show raw error strings to users
- **Action:** Centralize an error mapper that distinguishes RLS-denied, network, and validation errors.

---

## HIGH — Code Quality / Size

### 8. `views/SPKManager.tsx` is 970 lines, 4 components in one file
- Contains `SPKList`, `SPKDetailView`, `SPKForm`, and a mutation form
- **Action:** Split into `views/spk/SPKList.tsx`, `SPKDetailView.tsx`, `SPKForm.tsx`, `SPKMutationForm.tsx`.

### 9. `store.tsx` is 777 lines, mixes concerns
- Auth, CRUD for all entities, notifications, navigation, activity logging all in one provider
- Untestable as units
- **Action:** Extract per-entity service modules (`services/spkService.ts`, `services/financeService.ts`) consumed by a thinner store.

### 10. `components/UI.tsx` is 525 lines with 8 components
- `SwipeableCard` alone has 70+ lines of gesture state
- **Action:** Split into one file per component under `components/`. Extract swipe gesture logic into a custom hook (`useSwipeGesture`).

---

## MED — Duplication

### 11. Pagination logic duplicated across views
- `views/FinanceManager.tsx` lines ~51-65
- `views/ProductMaster.tsx` lines ~66-81
- `views/SPKManager.tsx` lines ~45-60
- **Action:** Extract a `usePagination<T>(items, itemsPerPage)` hook.

### 12. Date-range filtering duplicated in Reports
- `views/Reports.tsx` lines ~66-69, ~95-98, ~110-113, ~134-137
- **Action:** Extract `filterByDateRange(items, from, to, key)` utility into `utils.ts`.

### 13. Zod error mapping duplicated
- `views/ProductMaster.tsx` lines ~140-149
- `views/SPKManager.tsx` lines ~263-271
- Different mapping for the same kind of validation failure
- **Action:** Extract `mapZodErrors(error: ZodError)` into `utils.ts`.

---

## MED — Performance

### 14. SPK aggregation in app memory instead of DB
- `store.tsx` lines ~172-240 — fetches nested relations then computes `completedQty` per SPK in JS
- **Action:** Move aggregation to the RPC or a Postgres view; return pre-computed fields.

### 15. Manual 1000-row batched pagination
- `store.tsx` lines ~104-127, ~136-160, ~173-200 — loop until under 1000 rows
- Will scale poorly past a few thousand rows total
- **Action:** Move to cursor-based pagination, or load on-demand per view rather than hydrating everything in `fetchAllData()`.

### 16. Missing memoization on heavy renders
- `views/SPKManager.tsx` line ~225-231 — `filteredHistory` memoized (good), but the main SPK list view re-derives data on every render
- **Action:** Audit large `.map()` chains for `useMemo` opportunities.

### 17. External logo images not lazy-loaded
- `App.tsx` lines ~58, ~83 — Google-hosted images load on every page
- **Action:** Add `loading="lazy"` and a local fallback.

---

## MED — Documentation Gaps

### 18. README missing Supabase / RPC setup
- README mentions `GEMINI_API_KEY` but not Supabase setup or the required RPC functions (`create_spk_full`, `update_spk_full`)
- New developers cannot run the app from a clean clone
- **Action:** Document the full env list, RPC SQL definitions, and DB schema in README (or a `docs/setup.md`).

### 19. No `.env.example`
- Required env vars are undocumented at the file level
- **Action:** Add `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `GEMINI_API_KEY`.

### 20. No DB schema docs
- Table structure for `spks`, `spk_items`, `spk_mutations`, `transactions`, etc. is implicit in code only
- **Action:** Add `docs/database.md` with schema + RPC definitions.

---

## LOW — Hygiene

### 21. Unused `GEMINI_API_KEY`
- `vite.config.ts` lines ~14-15 — defined but never imported/fetched in app code
- **Action:** Either implement the Gemini feature or remove the config + README mention.

### 22. Dead code: `updateSPKItemStatus()`
- `store.tsx` lines ~576-577 — function body is a comment `// Handled by DB triggers`
- **Action:** Remove the no-op function from `AppContextType` and the provider.

### 23. Missing null checks in mutation flow
- `store.tsx` line ~596 — assumes `spk` and `item` exist before property access
- **Action:** Guard with early return + user-facing error if not found.

### 24. `package-lock.json` not tracked
- Per git status: `package-lock.json` is untracked
- Reproducible installs require committing the lockfile
- **Action:** Commit `package-lock.json`.

### 25. No testing infrastructure
- See `TESTING.md` — zero tests, no CI, no linter
- **Action:** See TESTING.md recommended next steps.

### 26. External CDN dependencies have no fallback
- Tailwind from CDN, Google Fonts, Google-hosted logos
- If any CDN is unavailable, the app degrades visibly
- **Action:** Move Tailwind to npm (build-time), self-host fonts, host logos in Supabase Storage or `/public`.

---

## Summary

**Block ship until fixed:** items 1, 3, 4 (security + silent data corruption).
**Pre-scale must-haves:** items 8, 9, 11, 14, 15 (maintainability + performance ceiling).
**Quality next:** items 18, 19, 25 (onboarding + safety net).

---

*Concerns analysis: 2026-06-04*
