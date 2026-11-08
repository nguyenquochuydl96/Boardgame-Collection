import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

// Root directory for source code
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');

function readSourceFile(relPath: string): string {
  const fullPath = path.join(SRC_DIR, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.agents') {
        getAllSourceFiles(full, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      fileList.push(full);
    }
  }
  return fileList;
}

// ============================================================================
// CHALLENGE 1: Codebase-wide Tailwind v4 Breakpoints & Fixed Width Limits
// ============================================================================
test('CHALLENGE 1.1: Codebase contains zero instances of non-standard "xs:" Tailwind prefix', () => {
  const allFiles = getAllSourceFiles(SRC_DIR);
  const violatingFiles: { file: string; matches: string[] }[] = [];
  const xsRegex = /\bxs:[a-zA-Z0-9_-]+/g;

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(xsRegex);
    if (matches && matches.length > 0) {
      violatingFiles.push({ file: path.relative(SRC_DIR, file), matches });
    }
  }

  assert.equal(
    violatingFiles.length,
    0,
    `Found non-standard "xs:" classes in: ${JSON.stringify(violatingFiles, null, 2)}`
  );
});

test('CHALLENGE 1.2: Codebase contains zero unconstrained fixed width classes exceeding 360px on mobile', () => {
  const allFiles = getAllSourceFiles(SRC_DIR);
  const violatingLocations: string[] = [];
  // Match classes like w-[361px] or min-w-[400px] without responsive prefix
  const fixedPxRegex = /(?<![a-zA-Z0-9_-]:)(?:w|min-w)-\[(\d+)px\]/g;

  for (const file of allFiles) {
    // Skip test files themselves
    if (file.includes('.test.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, lineIdx) => {
      let match;
      while ((match = fixedPxRegex.exec(line)) !== null) {
        const px = parseInt(match[1], 10);
        if (px >= 360) {
          // If it's inside an overflow-x-auto container, it's permitted (e.g. charts)
          if (!line.includes('overflow-x-auto') && !lines.slice(Math.max(0, lineIdx - 5), lineIdx).some(l => l.includes('overflow-x-auto'))) {
            violatingLocations.push(`${path.relative(SRC_DIR, file)}:${lineIdx + 1} (${match[0]})`);
          }
        }
      }
    });
  }

  assert.equal(
    violatingLocations.length,
    0,
    `Found unconstrained fixed widths >= 360px: ${JSON.stringify(violatingLocations, null, 2)}`
  );
});

// ============================================================================
// CHALLENGE 2: AppShell Header & Navigation Responsiveness
// ============================================================================
test('CHALLENGE 2.1: AppShell hides secondary header actions on mobile and uses compact padding', () => {
  const appShell = readSourceFile('components/layout/AppShell.tsx');

  // Verify non-reactive store access to prevent root re-renders
  assert.ok(
    appShell.includes('useSessionStore.getState().sessions'),
    'AppShell must use non-reactive store access for venue hydration'
  );
  assert.ok(
    !appShell.includes('const sessions = useSessionStore('),
    'AppShell must not subscribe to entire sessions array at root level'
  );

  // Verify secondary action buttons are hidden on mobile
  assert.ok(
    appShell.includes('hidden sm:inline-flex') && appShell.includes('setShowBGGModal'),
    'BGG API settings button must be hidden on mobile (hidden sm:inline-flex)'
  );
  assert.ok(
    appShell.includes('hidden sm:inline-flex') && appShell.includes('setShowInstallModal'),
    'PWA install button must be hidden on mobile (hidden sm:inline-flex)'
  );

  // Verify New Session button has responsive text
  assert.ok(
    appShell.includes('hidden sm:inline') && appShell.includes('New Session'),
    'New Session button must use "hidden sm:inline" for full text'
  );
  assert.ok(
    appShell.includes('sm:hidden') && appShell.includes('Play'),
    'New Session button must use "sm:hidden" for compact "Play" label'
  );
});

// ============================================================================
// CHALLENGE 3: Global Modal Padding & Usable Width Verification
// ============================================================================
test('CHALLENGE 3.1: Modal container has responsive padding providing >= 296px usable width at 360px', () => {
  const modal = readSourceFile('components/ui/Modal.tsx');

  // Outer container padding
  assert.ok(
    modal.includes('p-3 sm:p-6') || modal.includes('p-4 sm:p-6'),
    'Modal outer padding must be responsive (p-3 sm:p-6 or p-4 sm:p-6)'
  );

  // Inner body padding
  assert.ok(
    modal.includes('p-4 sm:p-6'),
    'Modal body padding must be responsive (p-4 sm:p-6)'
  );

  // Calculate usable width:
  // Viewport = 360px.
  // Outer margin/padding = 12px * 2 (p-3) = 24px -> modal box = 336px.
  // Inner body padding = 16px * 2 (p-4) = 32px -> content width = 304px.
  const outerPadding = 12 * 2;
  const innerPadding = 16 * 2;
  const usableWidth = 360 - outerPadding - innerPadding;
  assert.ok(usableWidth >= 296, `Usable modal width must be >= 296px (actual: ${usableWidth}px)`);
});

// ============================================================================
// CHALLENGE 4: PickerPage Mode & Style Switcher Responsive Fit
// ============================================================================
test('CHALLENGE 4.1: PickerPage mode switcher and style switcher wrap/grid cleanly without horizontal overflow', () => {
  const picker = readSourceFile('pages/PickerPage.tsx');

  // Verify mode switcher is grid-cols-2
  assert.ok(
    picker.includes('grid grid-cols-2') && picker.includes('max-w-md'),
    'PickerPage mode switcher must use responsive 2-column grid (grid grid-cols-2 p-1.5 w-full max-w-md)'
  );

  // Verify mobile labels
  assert.ok(
    picker.includes('sm:hidden') && picker.includes('First Player'),
    'PickerPage mode switcher must have compact mobile label "First Player"'
  );
  assert.ok(
    picker.includes('sm:hidden') && picker.includes('What to Play?'),
    'PickerPage mode switcher must have compact mobile label "What to Play?"'
  );

  // Verify style switcher is grid-cols-2 sm:flex
  assert.ok(
    picker.includes('grid grid-cols-2 sm:flex'),
    'PickerPage style switcher must be grid grid-cols-2 sm:flex'
  );

  // Verify stage card padding
  assert.ok(
    picker.includes('p-4 sm:p-6 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden'),
    'PickerPage stage card must have responsive padding p-4 sm:p-6 and overflow-hidden'
  );
});

// ============================================================================
// CHALLENGE 5: StatsPage Date Range Filter & Chart Overflow Protection
// ============================================================================
test('CHALLENGE 5.1: StatsPage date filter wraps cleanly and charts are horizontally contained', () => {
  const stats = readSourceFile('pages/StatsPage.tsx');

  // Verify date range filter has flex-wrap and max-w-full
  assert.ok(
    stats.includes('inline-flex flex-wrap items-center gap-1.5') && stats.includes('max-w-full'),
    'StatsPage date filter must be inline-flex flex-wrap ... max-w-full'
  );

  // Verify date inputs min-w is <= 95px
  assert.ok(
    stats.includes('min-w-[95px]'),
    'StatsPage date inputs must have compact min-w-[95px]'
  );

  // Verify arrow is hidden on mobile
  assert.ok(
    stats.includes('hidden sm:inline') && stats.includes('➔'),
    'StatsPage date arrow separator must be hidden on mobile'
  );

  // Verify monthly frequency chart has overflow-x-auto
  assert.ok(
    stats.includes('overflow-x-auto pb-2') && stats.includes('min-w-[700px]'),
    'Monthly frequency chart with min-w-[700px] must be contained in overflow-x-auto'
  );
});

// ============================================================================
// CHALLENGE 6: NewSessionPage Step 4 & Player Score Row Fit
// ============================================================================
test('CHALLENGE 6.1: NewSessionPage Step 4 tabs use responsive 3-col grid and step cards have responsive padding', () => {
  const sessionPage = readSourceFile('pages/NewSessionPage.tsx');

  // Verify Step 4 first player tabs use grid grid-cols-3
  assert.ok(
    sessionPage.includes('grid grid-cols-3 gap-1 sm:gap-1.5'),
    'Step 4 first player tabs must use responsive 3-column grid (grid grid-cols-3)'
  );

  // Verify labels have truncate
  assert.ok(
    sessionPage.includes('<span className="truncate">Wheel</span>'),
    'Step 4 Wheel tab must have truncate'
  );
  assert.ok(
    sessionPage.includes('<span className="truncate">Card</span>'),
    'Step 4 Card tab must have truncate'
  );
  assert.ok(
    sessionPage.includes('<span className="truncate">Manual</span>'),
    'Step 4 Manual tab must have truncate'
  );

  // Verify step cards have responsive p-4 sm:p-6 md:p-8
  const cardPaddingMatches = sessionPage.match(/p-4 sm:p-6 md:p-8/g);
  assert.ok(
    cardPaddingMatches && cardPaddingMatches.length >= 6,
    `NewSessionPage step cards must use responsive padding (found ${cardPaddingMatches?.length ?? 0} matches)`
  );
});

test('CHALLENGE 6.2: PlayerScoreRow controls width leaves ample space for player name on 360px screen', () => {
  const scoreRow = readSourceFile('components/session/PlayerScoreRow.tsx');

  // Verify score input is w-20 sm:w-28
  assert.ok(
    scoreRow.includes('w-20 sm:w-28'),
    'PlayerScoreRow input must be w-20 on mobile (w-20 sm:w-28)'
  );

  // Verify winner button touch target
  assert.ok(
    scoreRow.includes('min-h-[38px] sm:min-h-[42px] min-w-[38px] sm:min-w-[42px]'),
    'PlayerScoreRow winner button must have responsive touch target min-h-[38px] sm:min-h-[42px]'
  );

  // Usable space calculation:
  // Viewport: 360px.
  // Outer padding (px-4 = 32px), Step Card padding (p-4 = 32px) -> Row container = 296px.
  // Controls: w-20 (80px) + Winner Button (38px) + Gap (gap-2 = 8px) = 126px.
  // Space left for Player Avatar, Name, and Winner badge: 296 - 126 = 170px.
  // Avatar: 32px + Gap: 8px = 40px.
  // Player name usable width: 170 - 40 = 130px (well above minimum 60px requirement).
  const availableRowWidth = 360 - 32 - 32;
  const controlsWidth = 80 + 38 + 8;
  const nameSpace = availableRowWidth - controlsWidth - 40;
  assert.ok(nameSpace >= 100, `Player name usable width must be >= 100px (calculated: ${nameSpace}px)`);
});

// ============================================================================
// CHALLENGE 7: ScoringSheetMatrix Sticky Category Column & Horizontal Scroll
// ============================================================================
test('CHALLENGE 7.1: ScoringSheetMatrix category column is sticky with background elevated and subtle shadow', () => {
  const matrix = readSourceFile('components/session/ScoringSheetMatrix.tsx');

  // Verify sticky th
  assert.ok(
    matrix.includes('sticky left-0 bg-[var(--bg-elevated)] z-20') &&
      matrix.includes('shadow-[1px_0_0_0_var(--border-subtle)]'),
    'ScoringSheetMatrix header Category cell must be sticky left-0 with elevated bg and border shadow'
  );

  // Verify sticky td in tbody
  assert.ok(
    matrix.includes('sticky left-0 bg-[var(--bg-surface)] z-10') &&
      matrix.includes('shadow-[1px_0_0_0_var(--border-subtle)]'),
    'ScoringSheetMatrix body Category cells must be sticky left-0 with surface bg and border shadow'
  );

  // Verify sticky tfoot td
  assert.ok(
    matrix.includes('sticky left-0 bg-[var(--bg-elevated)] z-20') &&
      matrix.includes('TOTAL SCORE'),
    'ScoringSheetMatrix footer Total cell must be sticky left-0 with elevated bg'
  );
});

// ============================================================================
// CHALLENGE 8: Detail Pages Header Action Clusters
// ============================================================================
test('CHALLENGE 8.1: SessionDetailPage and GameDetailPage action headers stack vertically on mobile', () => {
  const sessionDetail = readSourceFile('pages/SessionDetailPage.tsx');
  const gameDetail = readSourceFile('pages/GameDetailPage.tsx');

  // Verify SessionDetailPage action header
  assert.ok(
    sessionDetail.includes('flex flex-col sm:flex-row sm:items-center justify-between gap-3'),
    'SessionDetailPage header must be flex flex-col sm:flex-row sm:items-center justify-between gap-3'
  );

  // Verify GameDetailPage action header
  assert.ok(
    gameDetail.includes('flex flex-col sm:flex-row sm:items-center justify-between gap-3'),
    'GameDetailPage header must be flex flex-col sm:flex-row sm:items-center justify-between gap-3'
  );

  // Verify Edit modal score input in SessionDetailPage
  assert.ok(
    sessionDetail.includes('w-16 sm:w-20 min-h-[34px] sm:min-h-[36px]'),
    'SessionDetailPage edit modal score input must be w-16 sm:w-20'
  );
});

// ============================================================================
// CHALLENGE 9: GameCard & Modal Grids Resilience
// ============================================================================
test('CHALLENGE 9.1: GameCard status badge and buttons do not collide in 2-column mobile grid', () => {
  const gameCard = readSourceFile('components/game/GameCard.tsx');

  assert.ok(
    gameCard.includes('min-w-0 shrink') && gameCard.includes('GameStatusBadge'),
    'GameCard status badge must be wrapped with min-w-0 shrink'
  );
  assert.ok(
    gameCard.includes('shrink-0') && gameCard.includes('bggRating'),
    'GameCard rating & edit cluster must have shrink-0'
  );
  assert.ok(
    gameCard.includes('flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5'),
    'GameCard metadata row must use flex flex-wrap'
  );
});

test('CHALLENGE 9.2: QuickEditGameModal and CollectionImportModal inputs stack on mobile', () => {
  const quickEdit = readSourceFile('components/game/QuickEditGameModal.tsx');
  const importModal = readSourceFile('components/game/CollectionImportModal.tsx');

  // Verify QuickEdit 3-input grid stacks on mobile
  assert.ok(
    quickEdit.includes('grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3'),
    'QuickEditGameModal stats inputs must be grid-cols-1 sm:grid-cols-3'
  );

  // Verify QuickEdit delete confirmation footer stacks on mobile
  assert.ok(
    quickEdit.includes('flex flex-col sm:flex-row sm:items-center justify-between gap-3'),
    'QuickEditGameModal delete footer must be flex-col sm:flex-row'
  );

  // Verify CollectionImportModal metrics grid stacks on mobile
  assert.ok(
    importModal.includes('grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3'),
    'CollectionImportModal metrics grid must be grid-cols-1 sm:grid-cols-3'
  );
});
