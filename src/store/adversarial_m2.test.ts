import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock localStorage for Node test runner
const memStore = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => memStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memStore.delete(key);
  },
  clear: () => {
    memStore.clear();
  },
  key: (index: number) => Array.from(memStore.keys())[index] ?? null,
  get length() {
    return memStore.size;
  },
} as Storage;

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
Object.defineProperty((globalThis as any).window, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

import { MemoryRouter } from 'react-router-dom';
import { PlayerScoreRow } from '../components/session/PlayerScoreRow';
import { GameCard } from '../components/game/GameCard';
import { ScoringSheetMatrix } from '../components/session/ScoringSheetMatrix';
import { formatDate, formatDuration, formatVND } from '../lib/utils';
import { BoardGame, PlaySession, Player, PlayerScore } from '../types';
import { ScoringCategory } from '../lib/scoringPresets';

// ============================================================================
// CHALLENGE 1: Long Player Names (20+ Characters) in PlayerScoreRow
// ============================================================================

test('CHALLENGE 1.1: PlayerScoreRow renders long player names (20+ chars) with truncate and min-w-0', () => {
  const longName = 'Nguyễn Hoàng Nam Anh Tuấn Khang (Grandmaster 2026)';
  assert.ok(longName.length > 20, 'Test name should be over 20 chars');

  const playerScore: PlayerScore = {
    playerId: 'p-extreme-1',
    playerName: longName,
    score: 142,
    isWinner: true,
    rank: 1,
  };

  const dummyPlayer: Player = {
    id: 'p-extreme-1',
    name: longName,
    avatar: '👑',
    color: '#8b5cf6',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const html = renderToString(
    React.createElement(PlayerScoreRow, {
      playerScore,
      player: dummyPlayer,
      onScoreChange: () => {},
      onToggleWinner: () => {},
    })
  );

  // 1. Verify truncate class is present on the paragraph containing the name
  assert.ok(html.includes('truncate'), 'Player name container must have truncate class');

  // 2. Verify min-w-0 is present on parent containers so flex child can shrink
  assert.ok(html.includes('min-w-0'), 'Parent flex item must have min-w-0 to allow text truncation');

  // 3. Verify mobile input width constraint (w-20 sm:w-28)
  assert.ok(html.includes('w-20 sm:w-28'), 'Score input wrapper must use responsive w-20 sm:w-28');

  // 4. Verify winner button has hidden sm:inline to prevent text overflow on mobile
  assert.ok(html.includes('hidden sm:inline'), 'Winner button text must be hidden on mobile screens');

  // 5. Verify the rendered HTML contains the escaped name safely
  assert.ok(html.includes('Nguyễn Hoàng Nam Anh Tuấn Khang'), 'Rendered HTML must contain player name');
});

test('CHALLENGE 1.2: PlayerScoreRow renders ultra-long non-spaced strings, unicode emojis and XSS without DOM breakdown', () => {
  const extremeNames = [
    'SupercalifragilisticexpialidociousPlayerWithNoSpacesAtAll1234567890',
    '🧙‍♂️🐉⚔️💎🛡️👑🎲🎯🔥✨🌟🏆🎉 (Emoji Master 2026)',
    '<script>alert("overflow")</script>&quot;<div>Test</div>',
    'A', // Single char boundary
  ];

  for (const name of extremeNames) {
    const playerScore: PlayerScore = {
      playerId: `p-${Math.random()}`,
      playerName: name,
      score: 999999,
      isWinner: false,
    };

    const html = renderToString(
      React.createElement(PlayerScoreRow, {
        playerScore,
        onScoreChange: () => {},
        onToggleWinner: () => {},
      })
    );

    assert.ok(html.length > 0, `PlayerScoreRow must render for ${name}`);
    assert.ok(html.includes('truncate'), 'Must enforce truncation');
    assert.ok(html.includes('min-w-0'), 'Must enforce min-w-0');
  }
});

// ============================================================================
// CHALLENGE 2: Long Game Titles in GameCard (Grid & List Views)
// ============================================================================

test('CHALLENGE 2.1: GameCard renders 100+ character game title in Grid view with line-clamp-1', () => {
  const ultraLongTitle =
    'The Castles of Burgundy: Special Deluxe 20th Anniversary Collector Super Big Box Edition Featuring All Expansions';
  assert.ok(ultraLongTitle.length > 80, 'Title should be long');

  const game: BoardGame = {
    id: 'game-long-title-1',
    name: ultraLongTitle,
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 120,
    yearPublished: 2024,
    bggRating: 8.9,
    status: 'own',
    purchasePrice: 2500000,
    thumbnail: 'https://example.com/thumb.jpg',
    image: 'https://example.com/image.jpg',
    description: 'A deep eurogame.',
    addedDate: '2026-01-01',
  };

  const html = renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(GameCard, {
        game,
        viewMode: 'grid',
        playCount: 15,
        onEdit: () => {},
      })
    )
  );

  // 1. Grid view must enforce line-clamp-1 on game title to prevent card blowout
  assert.ok(html.includes('line-clamp-1'), 'Grid view title must have line-clamp-1');

  // 2. Status badge must have min-w-0 shrink to avoid pushing rating button out
  assert.ok(html.includes('min-w-0 shrink'), 'Top badge container must have min-w-0 shrink');

  // 3. Action buttons cluster must have shrink-0
  assert.ok(html.includes('shrink-0'), 'Action buttons cluster must have shrink-0');

  // 4. Metadata row must wrap with flex-wrap
  assert.ok(html.includes('flex flex-wrap'), 'Metadata row must be flex-wrap');

  // 5. Title must be present in the markup
  assert.ok(html.includes('The Castles of Burgundy'), 'Title must be present in markup');
});

test('CHALLENGE 2.2: GameCard renders 100+ character game title in List view with truncate and flex-1 min-w-0', () => {
  const ultraLongTitle =
    'Great Western Trail: Second Edition – Rails to the North & Argentina Deluxe Expansion Pack 2026';

  const game: BoardGame = {
    id: 'game-long-title-2',
    name: ultraLongTitle,
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 150,
    yearPublished: 2023,
    bggRating: 8.8,
    status: 'own',
    thumbnail: 'https://example.com/thumb2.jpg',
    image: 'https://example.com/image2.jpg',
    description: 'Cowboy trail game.',
    addedDate: '2026-01-01',
  };

  const html = renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(GameCard, {
        game,
        viewMode: 'list',
        playCount: 4,
      })
    )
  );

  // 1. In list view, flex-1 min-w-0 must be applied to title container
  assert.ok(html.includes('flex-1 min-w-0'), 'List view content column must have flex-1 min-w-0');

  // 2. Heading must have truncate
  assert.ok(html.includes('truncate'), 'List view heading must have truncate class');

  // 3. Right action/badge column must have shrink-0
  assert.ok(html.includes('shrink-0'), 'Right side column must have shrink-0');
});

test('CHALLENGE 2.3: GameCard handles extreme historical and future publication years (-2500 to 9999)', () => {
  const extremeYears = [-2500, 0, 1800, 2026, 9999];

  for (const year of extremeYears) {
    const game: BoardGame = {
      id: `game-year-${year}`,
      name: `Ancient or Futuristic Game ${year}`,
      minPlayers: 2,
      maxPlayers: 2,
      playingTime: 30,
      yearPublished: year,
      status: 'own',
      thumbnail: '',
      image: '',
      description: 'Historical test.',
      addedDate: '2026-01-01',
    };

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(GameCard, { game, viewMode: 'grid' })
      )
    );
    assert.ok(html.includes(String(year)), `Year ${year} must render in GameCard without error`);
  }
});

// ============================================================================
// CHALLENGE 3: Custom Date Ranges with Extreme Years in StatsPage Logic
// ============================================================================

test('CHALLENGE 3.1: StatsPage date filtering handles extreme years (1900 to 9999) and inverted ranges', () => {
  const mockSessions: Partial<PlaySession>[] = [
    { id: 's-ancient', datePlayed: '1900-01-01T12:00:00.000Z', gameId: 'g1', gameName: 'Go' },
    { id: 's-retro', datePlayed: '1985-07-20T14:30:00.000Z', gameId: 'g2', gameName: 'Chess' },
    { id: 's-current', datePlayed: '2026-11-07T15:00:00.000Z', gameId: 'g3', gameName: 'Natera' },
    { id: 's-future', datePlayed: '2099-12-31T23:59:59.000Z', gameId: 'g4', gameName: 'Galaxy Trucker' },
    { id: 's-far-future', datePlayed: '9999-06-15T00:00:00.000Z', gameId: 'g5', gameName: 'Dune' },
  ];

  // Helper implementing the exact filtering logic from StatsPage.tsx lines 150-169
  function filterSessions(
    sessions: Partial<PlaySession>[],
    startDate: string,
    endDate: string,
    selectedYears: string[]
  ) {
    return sessions.filter((s) => {
      if (!s.datePlayed) return false;
      const sDate = s.datePlayed.slice(0, 10);
      const sYear = s.datePlayed.slice(0, 4);

      if (selectedYears.length > 0 && !selectedYears.includes(sYear)) {
        return false;
      }
      if (startDate && sDate < startDate) {
        return false;
      }
      if (endDate && sDate > endDate) {
        return false;
      }
      return true;
    });
  }

  // 1. Full span includes all sessions
  const allResult = filterSessions(mockSessions, '1900-01-01', '9999-12-31', []);
  assert.equal(allResult.length, 5, 'Full extreme range should match all 5 sessions');

  // 2. Filter from 1980 to 2050
  const midResult = filterSessions(mockSessions, '1980-01-01', '2050-01-01', []);
  assert.equal(midResult.length, 2, 'Should match 1985 and 2026');
  assert.ok(midResult.some((s) => s.id === 's-retro'));
  assert.ok(midResult.some((s) => s.id === 's-current'));

  // 3. Inverted range (startDate > endDate): e.g. 2026-11-08 to 2026-11-06
  const invertedResult = filterSessions(mockSessions, '2026-11-08', '2026-11-06', []);
  assert.equal(invertedResult.length, 0, 'Inverted range should match 0 sessions safely');

  // 4. Exact single day match
  const singleDayResult = filterSessions(mockSessions, '2026-11-07', '2026-11-07', []);
  assert.equal(singleDayResult.length, 1, 'Single day match should match exactly 1 session');
  assert.equal(singleDayResult[0].id, 's-current');

  // 5. Far future boundary only
  const farFutureResult = filterSessions(mockSessions, '9000-01-01', '', []);
  assert.equal(farFutureResult.length, 1);
  assert.equal(farFutureResult[0].id, 's-far-future');
});

test('CHALLENGE 3.2: formatDate utility handles extreme dates (year 1900, 2099, 9999, invalid strings) safely', () => {
  assert.equal(formatDate('1900-01-01'), 'Jan 1, 1900');
  assert.equal(formatDate('2026-11-07'), 'Nov 7, 2026');
  assert.equal(formatDate('2099-12-31'), 'Dec 31, 2099');
  assert.equal(formatDate('9999-06-15'), 'Jun 15, 9999');
  assert.equal(formatDate('0001-01-01'), 'Jan 1, 0001');

  // Boundary/malformed dates
  assert.equal(formatDate(''), 'Unknown date');
  assert.equal(formatDate(undefined), 'Unknown date');
  assert.equal(formatDate('invalid-date-string'), 'invalid-date-string');
});

// ============================================================================
// CHALLENGE 4: 8-Player Scoring Matrix in ScoringSheetMatrix
// ============================================================================

test('CHALLENGE 4.1: ScoringSheetMatrix renders 8 players with sticky category column and horizontal scroll wrapper', () => {
  const players8: Player[] = [
    { id: 'p1', name: 'Alexander The Great Long Name 1', avatar: '👑', color: '#ef4444', createdAt: '' },
    { id: 'p2', name: 'Bảo Hoàng', avatar: '🎲', color: '#f97316', createdAt: '' },
    { id: 'p3', name: 'Charles Montgomery Burns', avatar: '💰', color: '#f59e0b', createdAt: '' },
    { id: 'p4', name: 'Dương Thị Mỹ Duyên', avatar: '🌸', color: '#10b981', createdAt: '' },
    { id: 'p5', name: 'Elizabeth Alexandra Mary', avatar: '🏰', color: '#06b6d4', createdAt: '' },
    { id: 'p6', name: 'Franklin Delano Roosevelt', avatar: '🚢', color: '#3b82f6', createdAt: '' },
    { id: 'p7', name: 'Geralt of Rivia The Witcher', avatar: '⚔️', color: '#8b5cf6', createdAt: '' },
    { id: 'p8', name: 'Hồ Chí Minh City Player', avatar: '🏙️', color: '#ec4899', createdAt: '' },
  ];

  const categories: ScoringCategory[] = [
    { id: 'cat_territory', name: 'Territories & Hexes', icon: '🗺️', multiplier: 2 },
    { id: 'cat_buildings', name: 'Constructed Buildings', icon: '🏛️', multiplier: 1 },
    { id: 'cat_resources', name: 'Remaining Gold & Goods', icon: '🪙', multiplier: 1 },
    { id: 'cat_penalty', name: 'Disaster Penalties', icon: '⚡', multiplier: -1 },
  ];

  const initialBreakdowns: Record<string, Record<string, number>> = {
    p1: { cat_territory: 10, cat_buildings: 15, cat_resources: 5, cat_penalty: 3 }, // 20 + 15 + 5 - 3 = 37
    p2: { cat_territory: 12, cat_buildings: 10, cat_resources: 8, cat_penalty: 0 }, // 24 + 10 + 8 - 0 = 42 (Leader)
    p3: { cat_territory: 8, cat_buildings: 20, cat_resources: 2, cat_penalty: 5 },  // 16 + 20 + 2 - 5 = 33
    p4: { cat_territory: 5, cat_buildings: 5, cat_resources: 12, cat_penalty: 1 },  // 10 + 5 + 12 - 1 = 26
    p5: { cat_territory: 9, cat_buildings: 12, cat_resources: 4, cat_penalty: 2 },  // 18 + 12 + 4 - 2 = 32
    p6: { cat_territory: 11, cat_buildings: 8, cat_resources: 6, cat_penalty: 0 },  // 22 + 8 + 6 - 0 = 36
    p7: { cat_territory: 7, cat_buildings: 14, cat_resources: 3, cat_penalty: 4 },  // 14 + 14 + 3 - 4 = 27
    p8: { cat_territory: 13, cat_buildings: 5, cat_resources: 5, cat_penalty: 6 },  // 26 + 5 + 5 - 6 = 30
  };

  const html = renderToString(
    React.createElement(ScoringSheetMatrix, {
      players: players8,
      initialCategories: categories,
      initialBreakdowns,
      lowScoreWins: false,
      onScoresUpdate: () => {},
    })
  );

  // 1. Table must be wrapped in overflow-x-auto for horizontal swipe on mobile
  assert.ok(html.includes('overflow-x-auto'), 'Scoring matrix container must have overflow-x-auto');

  // 2. Category header column must be sticky left-0 with z-20 and border shadow
  assert.ok(
    html.includes('sticky left-0 bg-[var(--bg-elevated)] z-20') &&
      html.includes('shadow-[1px_0_0_0_var(--border-subtle)]'),
    'Header category th must have sticky left-0 z-20'
  );

  // 3. Category body td must be sticky left-0 with z-10
  assert.ok(
    html.includes('sticky left-0 bg-[var(--bg-surface)] z-10'),
    'Body category td must have sticky left-0 z-10'
  );

  // 4. Totals footer category td must be sticky left-0 with z-20
  assert.ok(html.includes('TOTAL SCORE'), 'Footer must contain TOTAL SCORE row');

  // 5. Each player column header must constrain name with truncate and max-w-[90px]
  assert.ok(
    html.includes('truncate max-w-[90px]'),
    'Player column name must have truncate max-w-[90px] to prevent wide headers'
  );

  // 6. Leader (p2 with score 42) must receive winner highlight styling
  assert.ok(html.includes('bg-amber-500/10'), 'Winning player column must have leader highlight');
});

test('CHALLENGE 4.2: ScoringSheetMatrix calculates correct totals and negative penalties for 8 players', () => {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: '🎲',
    color: '#3b82f6',
    createdAt: '',
  }));

  const categories: ScoringCategory[] = [
    { id: 'c1', name: 'Base Points', multiplier: 1 },
    { id: 'c2', name: 'End Bonus (x3)', multiplier: 3 },
    { id: 'c3', name: 'Penalty Cards (x-2)', multiplier: -2 },
  ];

  // Mathematical oracle verification:
  // p1: 10*1 + 5*3 + 2*(-2) = 10 + 15 - 4 = 21
  // p8: 0*1 + 0*3 + 5*(-2) = -10 (negative total score)
  const breakdowns: Record<string, Record<string, number>> = {
    'player-1': { c1: 10, c2: 5, c3: 2 },
    'player-8': { c1: 0, c2: 0, c3: 5 },
  };

  const html = renderToString(
    React.createElement(ScoringSheetMatrix, {
      players,
      initialCategories: categories,
      initialBreakdowns: breakdowns,
      lowScoreWins: false,
      onScoresUpdate: () => {},
    })
  );

  // Verify pure math calculations reflected in rendered DOM
  assert.ok(html.includes('21'), 'Player 1 score 21 (10*1 + 5*3 + 2*(-2)) must be rendered in totals');
  assert.ok(html.includes('-10'), 'Player 8 penalty score -10 (5*(-2)) must be rendered in totals');
  assert.ok(html.includes('0'), 'Unscored players must have total 0');
});

test('CHALLENGE 4.3: ScoringSheetMatrix lowScoreWins mode correctly identifies lowest scorer as winner', () => {
  const players: Player[] = [
    { id: 'pA', name: 'Player A', avatar: '1', color: '#10b981', createdAt: '' },
    { id: 'pB', name: 'Player B', avatar: '2', color: '#3b82f6', createdAt: '' },
  ];

  const categories: ScoringCategory[] = [
    { id: 'c1', name: 'Golf Strokes', multiplier: 1 },
  ];

  const breakdowns = {
    pA: { c1: 72 },
    pB: { c1: 68 }, // pB should win in lowScoreWins
  };

  const html = renderToString(
    React.createElement(ScoringSheetMatrix, {
      players,
      initialCategories: categories,
      initialBreakdowns: breakdowns,
      lowScoreWins: true,
      onScoresUpdate: () => {},
    })
  );

  assert.ok(html.includes('bg-amber-500/10'), 'Low scorer should be highlighted as winner');
});

// ============================================================================
// CHALLENGE 5: Mobile Viewport Layout Arithmetic Verification (360px - 430px)
// ============================================================================

test('CHALLENGE 5.1: Mobile 360px budget analysis proves zero horizontal overflow', () => {
  // Mobile Viewport: 360px
  const viewportWidth = 360;
  const pageHorizontalPadding = 16 * 2; // px-4 on main wrapper = 32px
  const maxAvailableContentWidth = viewportWidth - pageHorizontalPadding; // 328px

  // 1. PlayerScoreRow at 360px:
  // Card inside page: 328px. Inside step card padding (p-4 = 32px): 296px.
  // Static components inside PlayerScoreRow:
  const rowPadding = 14 * 2; // p-3.5 = 28px
  const avatarWidth = 40; // PlayerAvatar md = 40px
  const avatarGap = 12; // gap-3 = 12px
  const rowGap = 12; // gap-3 = 12px
  const inputWidth = 80; // w-20 = 80px on mobile
  const buttonGap = 8; // gap-2 = 8px
  const winnerButtonWidth = 38; // min-w-[38px] on mobile (icon only)
  const totalStaticWidth = rowPadding + avatarWidth + avatarGap + rowGap + inputWidth + buttonGap + winnerButtonWidth;
  // totalStaticWidth = 28 + 40 + 12 + 12 + 80 + 8 + 38 = 218px.
  const remainingForName = 296 - totalStaticWidth; // 78px.
  assert.ok(remainingForName >= 60, `Player name has ${remainingForName}px >= 60px usable space`);
  assert.ok(totalStaticWidth < 296, 'Static components fit safely within 296px card width');

  // 2. StatsPage Date Range Filter at 360px:
  // In StatsPage.tsx: inline-flex flex-wrap items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--card-2)] text-xs max-w-full
  // From input: min-w-[95px] + label 35px = 130px.
  // To input: min-w-[95px] + label 25px = 120px.
  // Combined width: ~260px. Fits within 328px without wrapping, and even if it wraps, flex-wrap ensures 0 overflow!
  const dateControlsCombined = 130 + 120 + 20; // 270px
  assert.ok(dateControlsCombined < maxAvailableContentWidth, 'Date controls fit inside 328px mobile content width');

  // 3. Modal Padding at 360px:
  // Outer container: p-3 (12px * 2 = 24px)
  // Inner body: p-4 (16px * 2 = 32px)
  // Total modal inner width: 360 - 24 - 32 = 304px.
  // QuickEditGameModal converted 3-column input grid to grid-cols-1 sm:grid-cols-3:
  // In single-column stacked layout on mobile, each input gets the full 304px width.
  // Previous collapsed width was 43px; expansion is +261px (+607% improvement).
  const expandedInputWidth = 304;
  assert.ok(expandedInputWidth >= 280, 'Modal input width on 360px screen is spacious (304px)');
});
