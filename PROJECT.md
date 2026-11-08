# Project: Boardgame Collection Review, Optimization & Responsiveness

## Architecture
- **Framework & Runtime**: React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, Motion (`motion/react`).
- **State Management**: Zustand stores with `persist` middleware storing to browser `localStorage` (`useSessionStore`, `usePlayerStore`, `useGameStore`, `useLocationStore`, `useSyncStore`).
- **Cloud Synchronization**: Optional Supabase cloud vault sync (`supabaseSync.ts`) with debounced auto-push and Postgres Realtime subscription.
- **Routing**: `react-router-dom` v7 with hash or browser history router.
- **Layout Architecture**: `AppShell` root layout wrapping desktop sidebar and mobile header/bottom nav.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Non-destructive Cloud Sync & Store Merge | Prevent startup or Realtime cloud sync from wiping freshly created local sessions (`bulkAddSessions` smart merge) | M1 | Survey 1, Survey 3 |
| F2 | In-browser Photo Compression | Downscale and compress uploaded session photos to prevent LocalStorage 5MB `QuotaExceededError` | M1 | Survey 1, Survey 3 |
| F3 | High-precision Play Date Timestamp | Preserve date selection with wall-clock time precision to guarantee deterministic chronological sorting for same-day matches | M1 | Survey 1, Survey 3 |
| F4 | Leaderboard Qualification Threshold Fix | Adjust 5% dynamic play threshold or provide toggle so new players/sessions immediately reflect in rankings | M1 | Survey 1 |
| F5 | Guest Player Store Persistence | Register one-off guest players in `usePlayerStore` to ensure `PlayerDetailPage` and leaderboards resolve cleanly | M1 | Survey 1 |
| F6 | AppShell Header & Layout Mobile Fit | Fix header action button cluster overflow (410px > 360px) and invalid `xs:` Tailwind v4 classes | M2 | Survey 2 |
| F7 | Modal Padding Optimization | Adjust global modal padding from fixed `p-6` to responsive `p-4 sm:p-6` to expand usable width on 360px screens | M2 | Survey 2 |
| F8 | PickerPage Mode & Style Switcher Fit | Convert 412px mode switcher tabs into responsive grid, eliminating page-level horizontal overflow | M2 | Survey 2 |
| F9 | StatsPage Date Range Filter Fit | Make date range inputs wrap responsively on mobile viewports | M2 | Survey 2 |
| F10 | NewSessionPage Step 4 & Score Row Fit | Make Step 4 selectors responsive grid, adjust `PlayerScoreRow` input widths so player names are not squeezed | M2 | Survey 2 |
| F11 | ScoringSheetMatrix Sticky Category Column | Add `sticky left-0 bg-card` to Category column so table horizontal scrolling keeps category visible | M2 | Survey 2 |
| F12 | Session & Game Detail Action Header Fit | Allow action headers ("Back" + Edit/Delete/Rematch buttons) to wrap cleanly on mobile | M2 | Survey 2 |
| F13 | GameCard & QuickEdit Modal Fit | Prevent badge/rating collisions on 2-col grid, make QuickEdit 3-column inputs responsive | M2 | Survey 2 |
| F14 | CloudSync & CollectionImport Modals Fit | Optimize 3-tab headers and 3-column metric cards for mobile screens | M2 | Survey 2 |
| F15 | NewSessionPage Timer Re-render Decoupling | Decouple 1 Hz timer state from draft auto-save effect to eliminate 1-second whole-page re-renders and synchronous LocalStorage writes | M3 | Survey 3 |
| F16 | AppShell Store Subscription Optimization | Replace root subscription to entire `sessions` array with non-reactive store access | M3 | Survey 3 |
| F17 | Leaderboard Sorting & Memoization Optimization | Replace repeated `new Date()` instantiations with string comparisons and single-pass streak calculations | M3 | Survey 3 |
| F18 | Service Worker Auto-Reload Protection | Prevent disruptive `controllerchange` page reloads while user is creating a session | M3 | Survey 3 |
| F19 | Automated Session Reactivity & State Tests | Comprehensive unit & integration tests verifying session addition, streak updates, and store persistence | E2E / M1 | Survey 1, Survey 3 |
| F20 | End-to-End Acceptance Verification | 100% E2E test suite pass across all tiers and production build verification (`npm run lint`, `npm run build`) | Final Milestone | ORIGINAL_REQUEST |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design and implement automated test suite covering session reactivity, leaderboard math, mobile layout constraints, and store persistence | none | **DONE** (TEST_READY.md published, 46 tests passing) |
| M1 | Session Completion Reactivity & State Synchronization | Implement non-destructive store merge, photo compression, timestamp preservation, leaderboard threshold adjustment, and guest player handling | none | **DONE** (Gate Passed: smart merge, photo compression, timestamp fix, guest store persistence) |
| M2 | Mobile UI Responsive Fit Across All Screens | Fix horizontal overflow, clipping, and cramped layouts across all 12 audited components (360px–430px viewports) | none | **DONE** (Gate Passed: zero overflow on 360px-430px, modal padding, sticky table column, 69 tests pass) |
| M3 | Performance Optimization & Codebase Bug Review | Decouple 1-second timer re-renders, optimize AppShell subscription, eliminate sort memory allocations, protect against SW reloads | none | PLANNED |
| M4 | Final Milestone: E2E Verification & Adversarial Hardening | Pass 100% of E2E test suite (Tiers 1-4), adversarial test hardening (Tier 5), verify production build & type checks | E2E, M1, M2, M3 | PLANNED |

---

## Interface Contracts

### Session Creation & Reactivity (`NewSessionPage` ↔ `useSessionStore` ↔ `Leaderboard`)
- `addSession(sessionData: SessionInput): PlaySession`:
  - Returns the newly created `PlaySession` with generated ID and high-precision `createdAt` and `datePlayed`.
  - Mutates `useSessionStore` synchronously; subscribers receive updated `sessions` immediately.
  - Triggers asynchronous cloud push without blocking UI navigation.
- `bulkAddSessions(newSessions: PlaySession[], replaceExisting?: boolean): void`:
  - When `replaceExisting === true`, preserves recently created local sessions (created < 60s ago or unpushed) by performing union merge.
- `calculateMinRequiredPlays(totalSessions: number, percentage?: number): number`:
  - Capped to reasonable maximum (e.g. `Math.min(5, Math.ceil(totalSessions * 0.05))`) or configurable via UI toggle.

### Responsive Component Constraints
- Outermost page wrappers must adhere to `max-w-full overflow-x-hidden`.
- Target mobile viewports: 360px (Samsung Galaxy S20/S24), 375px (iPhone SE), 390px (iPhone 14/15 Pro), 412px (Pixel 7).
- No fixed widths exceeding `w-20` (80px) on mobile inputs inside flex rows with multiple sibling controls.
- Modal inner width at 360px viewport: with `p-4 sm:p-6`, available width is `360 - 32 - 32 = 296px`. All content grids must be 1-column on mobile (`grid-cols-1 sm:grid-cols-3`).

---

## Code Layout
- `src/store/`:
  - `useSessionStore.ts`: Session store & smart merge logic
  - `usePlayerStore.ts`: Player store & guest player handling
  - `useGameStore.ts`: Game catalog store
  - `useSyncStore.ts`: Cloud synchronization state
- `src/lib/`:
  - `supabaseSync.ts`: Supabase vault push/pull/realtime sync
  - `utils.ts`: Statistics, streaks, formatting, image compression utility
- `src/pages/`:
  - `NewSessionPage.tsx`: Session creation wizard, photo handling, timer decoupling
  - `StatsPage.tsx`: Statistics overview, date range filters, leaderboard rendering
  - `SessionDetailPage.tsx`: Session details, rematch/edit/delete actions
  - `PickerPage.tsx`: First player & game picker, responsive mode switchers
  - `GameDetailPage.tsx`: Game details & action headers
  - `CollectionPage.tsx`: Game collection catalog & filters
  - `PlayerDetailPage.tsx`: Player statistics, match history & streak breakdown
- `src/components/`:
  - `layout/AppShell.tsx`: Header, responsive button cluster, bottom nav
  - `ui/Modal.tsx`: Global modal wrapper with responsive padding
  - `session/PlayerScoreRow.tsx`: Score entry row
  - `session/ScoringSheetMatrix.tsx`: Detailed score sheet table with sticky headers
  - `game/GameCard.tsx`: Grid & list game cards
  - `game/QuickEditGameModal.tsx`: Quick edit modal
  - `cloud/CloudSyncModal.tsx`: Cloud sync modal
  - `collection/CollectionImportModal.tsx`: BGG / CSV import modal
  - `dashboard/PlayerLeaderboardSection.tsx`: Leaderboards & qualification threshold
