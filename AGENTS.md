# AGENTS.md — Development Guidelines & Architectural Rules

This repository houses **HEO — Board Game Collection**, a high-performance, offline-first Progressive Web Application (PWA) designed to catalog board games, record play sessions, calculate advanced tabletop statistics (H-Index, streaks, win rates), and synchronize with Supabase Cloud.

All AI agents, automated assistants, and human contributors working on this codebase must adhere strictly to the rules below.

---

## 1. Global Number Formatting Rule

To ensure consistent, elegant, and readable data presentation across the entire application:

### 1.1. Core Utilities
Always import and use the standard helpers from `src/lib/utils.ts`:
- **`formatNumber(value, options?)`**: Standardizes numbers with `en-US` comma thousands separators.
  - Examples: `1454 -> "1,454"`, `92921 -> "92,921"`, `0 -> "0"`.
  - Handles `null`, `undefined`, string numbers, and `NaN` gracefully (falling back to `"0"`).
- **`formatCount(value, singular, plural?)`**: Combines thousands separator with correct singular/plural noun forms.
  - Examples: `formatCount(1, 'play') -> "1 play"`, `formatCount(1454, 'play') -> "1,454 plays"`.
  - Note: `pluralize(count, singular, plural)` automatically delegates to `formatCount()`.
- **`formatVND(value)`**: Preserved specifically for Vietnamese Dong currency (e.g., `1.800.000 ₫`).

### 1.2. Where to Apply
- All session counts, player counts, game counts, and venue counts.
- All playtimes (e.g., `1,549h`, `92,921m`).
- High scores, low scores, individual category breakdowns, and team scores.
- Benchmark and qualification numbers in charts, leaderboards, and modals.

### 1.3. Strict Exceptions (DO NOT Format With Commas)
Never format the following with commas or `formatNumber`:
1. **Calendar Years**: `yearPublished`, `year`, `2026`.
2. **IDs & Foreign Keys**: `bggId`, `gameId`, `sessionId`, `playerId`, entity `id`.
3. **Form Inputs**: Values inside `<input type="number">` or raw state variables bound to user input.
4. **Phone Numbers & External System Identifiers**.

---

## 2. UI & Branding Guidelines

### 2.1. Brand Identity
- **Application Name**: `HEO — Board Game Collection` (or `HEO Collection`).
- **Terminology**: Use **Collection** (do not regress to legacy "Vault" naming).

### 2.2. Language Protocol
- **100% Technical English UI**: All navigation links, labels, badges, KPI cards, charts, tooltips, dialogs, and error messages rendered on the frontend must be in clear, natural Technical English.

### 2.3. Design System: Warm Editorial
- **Visual Foundation**: Warm Editorial palette with CSS variables defined in `src/index.css`:
  - Accent: Terracotta (`#E5734F` / `var(--accent)`)
  - Semantic: Sage Green (`#588157` / `var(--good)`), Amber (`#DDA15E` / `var(--warn)`), Soft Slate Blue (`#4A7C9D`), Rust Earth (`#BC6C25`), Rose (`var(--bad)`).
  - Background & Surfaces: Skerry Slate & Warm Card surfaces (`var(--card)`, `var(--card-2)`, `var(--card-3)`).
- **Aspect Ratio Integrity**:
  - All album-style game box covers and thumbnails must retain original aspect ratios without stretching, squishing, or distortion (`0% distortion on WebKit/iOS Safari`).
  - Standard cover art uses `GameCoverImage` component with `aspect-[3/4]` or `aspect-[4/3]`.

---

## 3. Protected Core Architecture

The following core subsystems require careful handling and must never be altered or broken during incremental feature updates:

1. **Local Media & Offline Storage (`IndexedDB` & `Dexie`)**:
   - High-resolution cover art and photos are stored in IndexedDB (`idb://` protocol via `mediaStorage.ts`).
   - Keep media resolution asynchronous and lazy-loaded via `useResolvedMedia` hook.
2. **Zustand State Stores (`src/store/`)**:
   - `useGameStore`, `useSessionStore`, `usePlayerStore`, `useLocationStore`, `useSyncStore`.
   - Store state changes must persist locally and support dirty tracking for Cloud synchronization.
3. **Supabase Cloud Sync (`src/lib/supabaseSync.ts`)**:
   - Two-way push/pull with transactional conflict resolution and mobile QR handoff.
   - Schema compatibility with `games`, `sessions`, `players`, `locations` tables must be preserved.
4. **CI/CD Pipeline (`.github/workflows/deploy.yml`)**:
   - GitHub Pages deployment workflow. Do not remove build optimization steps or base path configuration (`/Boardgame-Collection/`).
5. **Quality Gates**:
   - Every commit must pass `npm run lint` (0 errors), `npm test` (100% pass), and `npm run build`.
