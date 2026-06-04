# Conventions

**Analysis Date:** 2026-06-04

> No linter or formatter config files exist (`.eslintrc*`, `.prettierrc*`, `eslint.config.*` all absent). Conventions below are **inferred from observed code**, not enforced by tooling.

## Code Style

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings (`'react'`, `'./store'`)
- **Semicolons:** Required, used consistently at end of statements
- **Line length:** No strict limit; some long Tailwind `className` chains exceed 120 chars
- **TypeScript strictness:** `skipLibCheck: true`, `isolatedModules: true` (`tsconfig.json`)

## File Naming

- **Component files:** PascalCase — `App.tsx`, `Dashboard.tsx`, `ProductMaster.tsx`, `SPKManager.tsx`
- **Non-component modules:** camelCase — `store.tsx`, `utils.ts`, `types.ts`, `supabaseClient.ts`
- **Config files:** camelCase or lower-case standard — `vite.config.ts`, `tsconfig.json`

## Variable & Function Naming

- **Variables:** camelCase — `isAuthenticated`, `currentView`, `editingProduct`
- **Functions:** camelCase — `formatCurrency()`, `triggerHaptic()`, `fetchActivityLogs()`
- **Constants:** camelCase or SCREAMING_SNAKE for inline magic numbers — `DEFAULT_USER`, `MAX_SWIPE`, `THRESHOLD`
- **React components:** PascalCase named exports with `React.FC` type — `export const Card: React.FC<Props> = ...`

## Component Naming

- All components exported as named exports (no default exports in components)
- Props interface suffix: `*Props` — `SwipeableCardProps`, `ButtonProps`, `BottomSheetProps`
- One global state hook: `useAppStore()`

## Enums

- Enum names: PascalCase
- Enum members: SCREAMING_SNAKE_CASE — `ItemStatus.PENDING`, `ItemStatus.COMPLETED`, `ItemStatus.CANCELLED`
- View states use string literals in same style — `'SPK_LIST'`, `'SPK_FORM'`

## Import Organization

Loose grouping (not strictly enforced):
1. React / external libraries (`react`, `lucide-react`, `recharts`)
2. Internal types/utils/store (`./types`, `./utils`, `./store`)
3. Components

**Path alias:** `@/*` configured in `tsconfig.json` and `vite.config.ts` (used sparingly — most imports are relative).

Example: see `views/ProductMaster.tsx` lines 2-8.

## Comment Style

- **Inline:** sparse `// comment` only where logic is non-obvious
- **Section dividers:** triple-dash style — `// --- ZOD SCHEMAS ---`, `// --- NATIVE UTILS ---`, `// --- LOGGING HELPER ---` (`utils.ts`, `store.tsx`)
- **JSX section comments:** `{/* Background Actions */}`, `{/* Foreground Content */}` (`components/UI.tsx`)
- **Language:** mixed English + Indonesian (Indonesian for business-domain explanations, e.g., `store.tsx` lines 44-75)
- **No JSDoc** — complex components and hooks lack parameter docs

## TypeScript Usage Patterns

- Centralized type system in `types.ts` (interfaces + enums)
- Heavy interface use for entities: `User`, `Product`, `SPK`, `Transaction`, `ActivityLog`, `AppContextType`
- Union literal types for restricted values: `type TransactionType = 'IN' | 'OUT'`
- `React.FC<Props>` for components
- Optional properties via `?` — `id?: string`, `email?: string`
- **Anti-pattern observed:** `catch (e: any)` used widely in `store.tsx` (see CONCERNS.md)
- Type assertions used sparingly — `as any` only in unavoidable spots (`App.tsx`: `navigate(item.id as any)`)

## Common Code Patterns

- **State management:** Context API + `useAppStore()` hook (no Redux/Zustand)
- **Forms:** local `useState` per field, validated via Zod schemas (`utils.ts`), errors surfaced via `showNotification()`
- **Pagination:** repeated `currentPage` / `itemsPerPage` / `totalPages` / `startIndex` pattern across views (duplication — see CONCERNS.md)
- **Confirmations:** `ConfirmationModal` + `isOpen` boolean state
- **Bottom sheets:** modal-like forms via `BottomSheet` + `isOpen` state
- **Haptics:** `triggerHaptic()` called on interactive actions
- **Error logging:** `try/catch` with `console.error()` (low-context; see CONCERNS.md)
- **Conditional rendering:** ternary + early return
- **Styling:** Tailwind CSS, custom dark theme tokens (`bg-dark-card`, `bg-dark-bg`, `text-primary`)

## Documentation

- README.md mentions Gemini key setup but does not cover Supabase or RPC setup
- No CONTRIBUTING.md, no CHANGELOG.md
- No JSDoc anywhere

---

*Conventions analysis: 2026-06-04*
*These conventions are inferred — adding ESLint + Prettier would lock them in.*
