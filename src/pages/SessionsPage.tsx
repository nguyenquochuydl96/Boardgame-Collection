import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Users,
  User,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Crown,
  Play,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { SessionCard } from '../components/session/SessionCard';
import { QuickFirstPlayerModal } from '../components/session/QuickFirstPlayerModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameStore } from '../store/useGameStore';
import { formatMonthYear } from '../lib/utils';
import { PlaySession } from '../types';
import { cn } from '../components/ui/cn';

const PAGE_SIZE = 30;

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export const SessionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);
  const games = useGameStore((s) => s.games);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerMatchMode, setPlayerMatchMode] = useState<'or' | 'and'>('or');
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Panel & UI States
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'players' | 'games' | 'time'>('players');
  const [playerFilterSearch, setPlayerFilterSearch] = useState('');
  const [gameFilterSearch, setGameFilterSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [isQuickFirstPlayerOpen, setIsQuickFirstPlayerOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<{ gameName: string; elapsedSecs: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('boardgame_session_draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.sessionStartTime < 36 * 60 * 60 * 1000) {
          const gameObj = games.find((g) => g.id === parsed.gameId);
          const activeMs = parsed.isTimerRunning
            ? Date.now() - parsed.sessionStartTime - (parsed.pausedDurationMs || 0)
            : parsed.pauseStartTime
            ? parsed.pauseStartTime - parsed.sessionStartTime - (parsed.pausedDurationMs || 0)
            : 0;
          setActiveDraft({
            gameName: gameObj?.name || 'Trận Đấu',
            elapsedSecs: Math.max(0, Math.floor(activeMs / 1000)),
          });
        }
      }
    } catch {}
  }, [games]);

  // Sync from URL params on load (e.g. ?gameId=... or ?playerId=...)
  useEffect(() => {
    const urlGameId = searchParams.get('gameId');
    if (urlGameId && !selectedGameIds.includes(urlGameId)) {
      setSelectedGameIds([urlGameId]);
      setIsFilterPanelOpen(true);
      setActiveFilterTab('games');
    }

    const urlPlayerId = searchParams.get('playerId');
    if (urlPlayerId && !selectedPlayerIds.includes(urlPlayerId)) {
      setSelectedPlayerIds([urlPlayerId]);
      setIsFilterPanelOpen(true);
      setActiveFilterTab('players');
    }
  }, [searchParams]);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  // Available games derived from sessions with play count and thumbnail
  const gamesWithPlays = useMemo(() => {
    const counts = new Map<string, { count: number; name: string; thumbnail?: string }>();
    const gameMap = new Map(games.map((g) => [g.id, g]));

    for (const s of sessions) {
      if (!s.gameId) continue;
      const existing = counts.get(s.gameId);
      if (existing) {
        existing.count++;
      } else {
        const storeGame = gameMap.get(s.gameId);
        counts.set(s.gameId, {
          count: 1,
          name: s.gameName || storeGame?.name || 'Boardgame',
          thumbnail: storeGame?.thumbnail,
        });
      }
    }

    return Array.from(counts.entries())
      .map(([id, info]) => ({
        id,
        name: info.name,
        plays: info.count,
        thumbnail: info.thumbnail,
      }))
      .sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));
  }, [sessions, games]);

  // Available years from session history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const s of sessions) {
      if (s.datePlayed) {
        const y = new Date(s.datePlayed).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      }
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [sessions]);

  // Filtered & Sorted Sessions
  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...sessions]
      .filter((s) => {
        // 1. Search Query (gameName, notes, location, playerName)
        if (query) {
          const matchGame = s.gameName?.toLowerCase().includes(query);
          const matchNotes = s.notes?.toLowerCase().includes(query);
          const matchLocation = s.location?.toLowerCase().includes(query);
          const matchPlayer = s.players?.some((p) =>
            p.playerName?.toLowerCase().includes(query)
          );
          if (!matchGame && !matchNotes && !matchLocation && !matchPlayer) {
            return false;
          }
        }

        // 2. Multi-Player Filter
        if (selectedPlayerIds.length > 0) {
          const sessionPlayerIds = s.players?.map((p) => p.playerId) || [];
          if (playerMatchMode === 'and') {
            const hasAll = selectedPlayerIds.every((pid) => sessionPlayerIds.includes(pid));
            if (!hasAll) return false;
          } else {
            const hasAny = selectedPlayerIds.some((pid) => sessionPlayerIds.includes(pid));
            if (!hasAny) return false;
          }
        }

        // 3. Multi-Game Filter
        if (selectedGameIds.length > 0) {
          if (!selectedGameIds.includes(s.gameId)) {
            return false;
          }
        }

        // 4. Multi-Year Filter
        if (selectedYears.length > 0) {
          const y = String(new Date(s.datePlayed).getFullYear());
          if (!selectedYears.includes(y)) {
            return false;
          }
        }

        // 5. Multi-Month Filter (1 to 12)
        if (selectedMonths.length > 0) {
          const m = new Date(s.datePlayed).getMonth() + 1;
          if (!selectedMonths.includes(m)) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
      );
  }, [
    sessions,
    searchQuery,
    selectedPlayerIds,
    playerMatchMode,
    selectedGameIds,
    selectedYears,
    selectedMonths,
  ]);

  // Windowed visible slice for 60 FPS performance
  const visibleSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleCount);
  }, [filteredSessions, visibleCount]);

  // Group visible sessions by Month
  const groupedByMonth = useMemo(() => {
    const groups: Array<{ monthLabel: string; items: PlaySession[] }> = [];
    for (const s of visibleSessions) {
      const label = formatMonthYear(s.datePlayed);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.monthLabel !== label) {
        groups.push({ monthLabel: label, items: [s] });
      } else {
        lastGroup.items.push(s);
      }
    }
    return groups;
  }, [visibleSessions]);

  const hasMore = visibleCount < filteredSessions.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const activeFiltersCount =
    selectedPlayerIds.length +
    selectedGameIds.length +
    selectedYears.length +
    selectedMonths.length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlayerIds([]);
    setPlayerMatchMode('or');
    setSelectedGameIds([]);
    setSelectedYears([]);
    setSelectedMonths([]);
    setVisibleCount(PAGE_SIZE);
    searchParams.delete('gameId');
    searchParams.delete('playerId');
    setSearchParams(searchParams, { replace: true });
  };

  // Toggle Handlers
  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setVisibleCount(PAGE_SIZE);
  };

  const toggleGame = (id: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
    setVisibleCount(PAGE_SIZE);
  };

  const toggleYear = (yr: string) => {
    setSelectedYears((prev) =>
      prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr]
    );
    setVisibleCount(PAGE_SIZE);
  };

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
    setVisibleCount(PAGE_SIZE);
  };

  // Filtered lists inside picker panels
  const filteredPlayersList = useMemo(() => {
    if (!playerFilterSearch.trim()) return players;
    const q = playerFilterSearch.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, playerFilterSearch]);

  const filteredGamesList = useMemo(() => {
    if (!gameFilterSearch.trim()) return gamesWithPlays;
    const q = gameFilterSearch.toLowerCase();
    return gamesWithPlays.filter((g) => g.name.toLowerCase().includes(q));
  }, [gamesWithPlays, gameFilterSearch]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)]">
              Lịch Sử Ván Chơi
            </h1>
            <p className="text-sm text-[var(--text-secondary)] tabular-nums">
              Đã ghi nhận {sessions.length.toLocaleString()} ván đấu cùng bạn bè
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setIsQuickFirstPlayerOpen(true)}
              className="border-amber-500/30 text-amber-300 hover:border-amber-400"
            >
              <Crown className="w-4 h-4 mr-1.5 text-amber-400" />
              Chọn Người Đi Đầu
            </Button>
            <Link to="/sessions/new">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-1.5" />
                Tạo Ván Mới
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Session in Progress Callout Banner */}
        {activeDraft && (
          <Link
            to="/sessions/new"
            className="block p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 hover:border-amber-300 transition-all shadow-lg group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-amber-300 transition-colors">
                    Có một ván game đang diễn ra: <strong>{activeDraft.gameName}</strong>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Đã chơi được khoảng {Math.floor(activeDraft.elapsedSecs / 60)} phút · Bấm để tiếp tục nhập điểm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400 shrink-0">
                <span>Vào Ván</span>
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>
          </Link>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <Input
                placeholder="Tìm theo tên game, người chơi, quán cafe, ghi chú..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
              />
            </div>

            {/* Quick Trigger Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsFilterPanelOpen(true);
                  setActiveFilterTab('players');
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none',
                  selectedPlayerIds.length > 0
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Người chơi</span>
                {selectedPlayerIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-mono font-bold">
                    {selectedPlayerIds.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFilterPanelOpen(true);
                  setActiveFilterTab('games');
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none',
                  selectedGameIds.length > 0
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                )}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Tựa game</span>
                {selectedGameIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-mono font-bold">
                    {selectedGameIds.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFilterPanelOpen(true);
                  setActiveFilterTab('time');
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none',
                  selectedYears.length > 0 || selectedMonths.length > 0
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Năm &amp; Tháng</span>
                {selectedYears.length + selectedMonths.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-slate-950 font-mono font-bold">
                    {selectedYears.length + selectedMonths.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border select-none',
                  isFilterPanelOpen
                    ? 'bg-[var(--accent-primary)] text-white border-transparent'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                )}
                title="Bật / tắt bảng bộ lọc nâng cao"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bộ lọc</span>
                {isFilterPanelOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* EXPANDABLE MULTI-SELECT FILTER DRAWER */}
          {isFilterPanelOpen && (
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-4 animate-in fade-in duration-200">
              {/* Tab Navigation */}
              <div className="flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] gap-1">
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('players')}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                    activeFilterTab === 'players'
                      ? 'bg-[var(--accent-primary)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>👥 Người chơi ({selectedPlayerIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('games')}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                    activeFilterTab === 'games'
                      ? 'bg-[var(--accent-primary)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  )}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>🎲 Tựa Game ({selectedGameIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('time')}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                    activeFilterTab === 'time'
                      ? 'bg-[var(--accent-primary)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>📅 Thời Gian ({selectedYears.length + selectedMonths.length})</span>
                </button>
              </div>

              {/* TAB 1: MULTI-PLAYER FILTER */}
              {activeFilterTab === 'players' && (
                <div className="space-y-3 bg-[var(--bg-surface)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Match Mode Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Chế độ khớp:</span>
                      <div className="flex p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => setPlayerMatchMode('or')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
                            playerMatchMode === 'or'
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'text-[var(--text-secondary)] hover:text-white'
                          )}
                          title="Ván có ít nhất 1 người chơi được chọn"
                        >
                          Bất kỳ ai (OR)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerMatchMode('and')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
                            playerMatchMode === 'and'
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'text-[var(--text-secondary)] hover:text-white'
                          )}
                          title="Ván có đầy đủ tất cả những người được chọn cùng chơi chung"
                        >
                          Cùng tham gia (AND)
                        </button>
                      </div>
                    </div>

                    {/* Quick Selection Actions */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerIds(players.map((p) => p.id))}
                        className="text-[var(--accent-neon)] font-bold hover:underline cursor-pointer"
                      >
                        Chọn tất cả ({players.length})
                      </button>
                      <span className="text-[var(--text-muted)]">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerIds([])}
                        className="text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Player Search Input */}
                  <Input
                    placeholder="Lọc tên người chơi..."
                    value={playerFilterSearch}
                    onChange={(e) => setPlayerFilterSearch(e.target.value)}
                    className="text-xs py-1"
                  />

                  {/* Players Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredPlayersList.map((p) => {
                      const isSelected = selectedPlayerIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePlayer(p.id)}
                          className={cn(
                            'p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none text-left',
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                              : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <PlayerAvatar player={p} size="sm" />
                            <span className="text-xs font-bold truncate">{p.name}</span>
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
                              isSelected
                                ? 'bg-amber-500 text-slate-950'
                                : 'border border-[var(--border-subtle)]'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: MULTI-GAME FILTER */}
              {activeFilterTab === 'games' && (
                <div className="space-y-3 bg-[var(--bg-surface)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Chọn một hoặc nhiều tựa game đã từng chơi:
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedGameIds(gamesWithPlays.slice(0, 10).map((g) => g.id))}
                        className="text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Top 10 phổ biến
                      </button>
                      <span className="text-[var(--text-muted)]">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedGameIds(gamesWithPlays.map((g) => g.id))}
                        className="text-[var(--accent-neon)] font-bold hover:underline cursor-pointer"
                      >
                        Chọn tất cả ({gamesWithPlays.length})
                      </button>
                      <span className="text-[var(--text-muted)]">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedGameIds([])}
                        className="text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Game Search Input */}
                  <Input
                    placeholder="Tìm kiếm theo tên tựa game..."
                    value={gameFilterSearch}
                    onChange={(e) => setGameFilterSearch(e.target.value)}
                    className="text-xs py-1"
                  />

                  {/* Games Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {filteredGamesList.map((g) => {
                      const isSelected = selectedGameIds.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGame(g.id)}
                          className={cn(
                            'p-2 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none text-left',
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                              : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {g.thumbnail ? (
                              <img
                                src={g.thumbnail}
                                alt={g.name}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-900 shrink-0 border border-white/10"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-sm shrink-0">
                                🎲
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold truncate">{g.name}</h4>
                              <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                                {g.plays} ván đã chơi
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
                              isSelected
                                ? 'bg-emerald-500 text-slate-950'
                                : 'border border-[var(--border-subtle)]'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: MULTI-YEAR & MULTI-MONTH FILTER */}
              {activeFilterTab === 'time' && (
                <div className="space-y-4 bg-[var(--bg-surface)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)]">
                  {/* Years Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)]">Lọc theo Năm:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedYears([...availableYears])}
                          className="text-sky-400 font-bold hover:underline cursor-pointer"
                        >
                          Tất cả các năm
                        </button>
                        <span className="text-[var(--text-muted)]">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedYears([])}
                          className="text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                        >
                          Bỏ chọn năm
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {availableYears.map((yr) => {
                        const isSelected = selectedYears.includes(yr);
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => toggleYear(yr)}
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border select-none',
                              isSelected
                                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                            )}
                          >
                            Năm {yr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Months Section */}
                  <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)]">Lọc theo Tháng:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                          className="text-sky-400 font-bold hover:underline cursor-pointer"
                        >
                          Cả 12 tháng
                        </button>
                        <span className="text-[var(--text-muted)]">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMonths([])}
                          className="text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                        >
                          Bỏ chọn tháng
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {MONTH_NAMES.map((mName, index) => {
                        const mNum = index + 1;
                        const isSelected = selectedMonths.includes(mNum);
                        return (
                          <button
                            key={mNum}
                            type="button"
                            onClick={() => toggleMonth(mNum)}
                            className={cn(
                              'py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border select-none text-center',
                              isSelected
                                ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-sm'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                            )}
                          >
                            {mName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE FILTER CHIPS & SUMMARY BAR */}
          {(searchQuery || activeFiltersCount > 0) && (
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)] mr-1">
                  Đang lọc:
                </span>

                {/* Match Mode Pill */}
                {selectedPlayerIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPlayerMatchMode((m) => (m === 'or' ? 'and' : 'or'))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                    title="Nhấn để đổi giữa Cùng tham gia (AND) và Bất kỳ ai (OR)"
                  >
                    <span>Khớp: {playerMatchMode === 'and' ? 'Cùng tham gia (AND)' : 'Bất kỳ ai (OR)'}</span>
                    <RotateCcw className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                )}

                {/* Player Chips */}
                {selectedPlayerIds.map((pid) => {
                  const p = playersById[pid];
                  return (
                    <span
                      key={pid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    >
                      <span>👥 {p ? p.name : 'Người chơi'}</span>
                      <button
                        type="button"
                        onClick={() => togglePlayer(pid)}
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Bỏ người chơi này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Game Chips */}
                {selectedGameIds.map((gid) => {
                  const g = gamesWithPlays.find((item) => item.id === gid);
                  return (
                    <span
                      key={gid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    >
                      <span>🎲 {g ? g.name : 'Game'}</span>
                      <button
                        type="button"
                        onClick={() => toggleGame(gid)}
                        className="hover:text-white ml-0.5 cursor-pointer"
                        title="Bỏ tựa game này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Year Chips */}
                {selectedYears.map((yr) => (
                  <span
                    key={yr}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30"
                  >
                    <span>📅 {yr}</span>
                    <button
                      type="button"
                      onClick={() => toggleYear(yr)}
                      className="hover:text-white ml-0.5 cursor-pointer"
                      title="Bỏ năm này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Month Chips */}
                {selectedMonths.map((mNum) => (
                  <span
                    key={mNum}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30"
                  >
                    <span>🗓️ {MONTH_NAMES[mNum - 1]}</span>
                    <button
                      type="button"
                      onClick={() => toggleMonth(mNum)}
                      className="hover:text-white ml-0.5 cursor-pointer"
                      title="Bỏ tháng này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Clear All Button */}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>

              <div className="text-xs text-[var(--text-secondary)]">
                Tìm thấy <strong className="text-white font-bold">{filteredSessions.length}</strong> trên tổng số {sessions.length} ván đấu
              </div>
            </div>
          )}
        </div>

        {/* Sessions List */}
        {groupedByMonth.length > 0 ? (
          <div className="space-y-8">
            {groupedByMonth.map((group) => (
              <section key={group.monthLabel} className="space-y-3">
                <div className="sticky top-14 lg:top-0 z-20 py-2 px-3.5 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-subtle)] inline-flex items-center gap-2 shadow-sm">
                  <Calendar className="w-4 h-4 text-[var(--accent-neon)]" />
                  <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
                    {group.monthLabel}
                  </h2>
                  <span className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">
                    ({group.items.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {group.items.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      playersById={playersById}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Progressive Loading Controls */}
            {hasMore ? (
              <div className="p-6 rounded-2xl bg-[var(--bg-card)]/80 border border-[var(--border-subtle)] text-center space-y-3">
                <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                  Đang hiển thị {visibleSessions.length} trên tổng số {filteredSessions.length} ván đấu
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLoadMore}
                  className="mx-auto"
                >
                  <ChevronDown className="w-4 h-4 mr-1.5" />
                  Tải Thêm 30 Ván Nữa
                </Button>
              </div>
            ) : (
              filteredSessions.length > PAGE_SIZE && (
                <p className="text-center text-xs text-[var(--text-muted)] py-4">
                  Đã hiển thị toàn bộ {filteredSessions.length} ván đấu
                </p>
              )
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-4 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[image:var(--gradient-hero)] flex items-center justify-center text-3xl mx-auto shadow-xl shadow-[var(--accent-glow)]">
              🎲
            </div>
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                Không tìm thấy ván chơi nào
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {searchQuery || activeFiltersCount > 0
                  ? 'Không có ván chơi nào khớp với bộ lọc hiện tại của bạn.'
                  : 'Chưa có lịch sử ván chơi nào được ghi nhận. Hãy tạo ván chơi đầu tiên!'}
              </p>
            </div>
            {searchQuery || activeFiltersCount > 0 ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Đặt lại bộ lọc
              </Button>
            ) : (
              <Link to="/sessions/new">
                <Button variant="primary">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Ghi Nhận Ván Đầu Tiên
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Floating Action Button (FAB) */}
        <Link
          to="/sessions/new"
          aria-label="Tạo ván chơi mới"
          className="fixed right-5 bottom-20 lg:bottom-8 z-30 min-h-[52px] px-5 rounded-2xl bg-[image:var(--gradient-hero)] text-white font-display font-bold text-sm shadow-xl shadow-[var(--accent-glow)] inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo Ván Mới</span>
        </Link>

        {/* Quick First Player Picker Modal */}
        <QuickFirstPlayerModal
          isOpen={isQuickFirstPlayerOpen}
          onClose={() => setIsQuickFirstPlayerOpen(false)}
        />
      </div>
    </PageTransition>
  );
};

export default SessionsPage;
