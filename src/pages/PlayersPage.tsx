import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Swords,
  Trophy,
  Gamepad2,
  Check,
  Edit3,
  Quote,
  Sparkles,
  MapPin,
  Users,
  Plus,
  Search,
  Building2,
  Star,
  Dices,
  RotateCcw,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { PlayerFormModal } from '../components/player/PlayerFormModal';
import { PlayerCompareModal } from '../components/dashboard/PlayerCompareModal';
import { LocationCard, LocationMetrics } from '../components/location/LocationCard';
import { LocationFormModal } from '../components/location/LocationFormModal';
import { cn } from '../components/ui/cn';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { useLocationStore } from '../store/useLocationStore';
import { useGameStore } from '../store/useGameStore';
import { getPlayStyleInfo } from '../lib/boardgameAvatars';
import { formatNumber, formatCount, normalizeLocationKey, sortVenuesByPlayCount, sortPlayersByPlayCount, getSessionWinners, filterSessionsByRecordScope } from '../lib/utils';
import { Player, GameLocation } from '../types';

export const PlayersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const players = usePlayerStore((s) => s.players);
  const sessions = useSessionStore((s) => s.sessions);
  const clearSessionsAtLocation = useSessionStore((s) => s.clearSessionsAtLocation);
  const games = useGameStore((s) => s.games);
  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const deleteLocation = useLocationStore((s) => s.deleteLocation);
  const setDefaultLocation = useLocationStore((s) => s.setDefaultLocation);
  const syncHistoricalLocations = useLocationStore((s) => s.syncHistoricalLocations);

  // Subtab State: 'players' | 'locations'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'players' | 'locations'>(
    tabParam === 'locations' ? 'locations' : 'players'
  );

  // Sync tab with URL
  const handleTabChange = (tab: 'players' | 'locations') => {
    setActiveTab(tab);
    if (tab === 'locations') {
      searchParams.set('tab', 'locations');
    } else {
      searchParams.delete('tab');
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Automatically sync all historical locations from sessions
  useEffect(() => {
    if (sessions.length > 0) {
      syncHistoricalLocations(sessions);
    }
  }, [sessions, syncHistoricalLocations]);

  // Player state
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Location state
  const [locationSearch, setLocationSearch] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<GameLocation | null>(null);

  const toggleComparePlayer = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const gamesById = useMemo(() => {
    const map = new Map<string, typeof games[0]>();
    for (const g of games) {
      if (g.id) map.set(g.id, g);
    }
    return map;
  }, [games]);

  // 1. Precompute competitive player stats in a single pass O(S); Co-op stays separate
  const playerStatsMap = useMemo(() => {
    const stats: Record<string, { totalGames: number; wins: number; winRate: number }> = {};
    for (const p of players) {
      stats[p.id] = { totalGames: 0, wins: 0, winRate: 0 };
    }
    const competitiveSessions = filterSessionsByRecordScope(sessions, 'competitive', gamesById);
    for (const s of competitiveSessions) {
      if (!s.players) continue;
      const game = gamesById.get(s.gameId);
      const winners = getSessionWinners(s, game);
      for (const p of s.players) {
        if (!stats[p.playerId]) {
          stats[p.playerId] = { totalGames: 0, wins: 0, winRate: 0 };
        }
        stats[p.playerId].totalGames += 1;
        if (winners.some((w) => w.playerId === p.playerId)) {
          stats[p.playerId].wins += 1;
        }
      }
    }
    for (const id in stats) {
      const entry = stats[id];
      entry.winRate = entry.totalGames > 0 ? Math.round((entry.wins / entry.totalGames) * 100) : 0;
    }
    return stats;
  }, [players, sessions, gamesById]);

  // 1b. Sort players descending by play count with wins/winRate/name tie-breaking
  const sortedPlayers = useMemo(
    () => sortPlayersByPlayCount(players, playerStatsMap),
    [players, playerStatsMap]
  );

  const selectedComparePlayers = useMemo(
    () =>
      sortPlayersByPlayCount(
        players.filter((p) => selectedCompareIds.includes(p.id)),
        playerStatsMap
      ),
    [players, selectedCompareIds, playerStatsMap]
  );

  // 2. Precomputed per-venue metrics in a single O(S) pass, keyed by normalizeLocationKey
  const venueMetricsByKey = useMemo(() => {
    const map = new Map<
      string,
      { count: number; gameCounts: Record<string, { count: number; name: string }>; lastDate?: string; rawNames: Set<string> }
    >();

    for (const s of sessions) {
      if (!s.location || !s.location.trim()) continue;
      const key = normalizeLocationKey(s.location);
      if (!key) continue;

      let entry = map.get(key);
      if (!entry) {
        entry = { count: 0, gameCounts: {}, lastDate: undefined, rawNames: new Set() };
        map.set(key, entry);
      }
      entry.count += 1;
      entry.rawNames.add(s.location.trim());

      const gId = s.gameId || s.gameName || 'unknown';
      if (!entry.gameCounts[gId]) {
        entry.gameCounts[gId] = { count: 0, name: s.gameName || 'Board Game' };
      }
      entry.gameCounts[gId].count += 1;
      if (!entry.lastDate || (s.datePlayed && s.datePlayed > entry.lastDate)) {
        entry.lastDate = s.datePlayed;
      }
    }
    return map;
  }, [sessions]);

  // 3. Combine saved preset locations and historical session locations, deduplicated by normalizeLocationKey
  const combinedVenues = useMemo(() => {
    const keyMap = new Map<
      string,
      GameLocation & { playCount: number; metrics: LocationMetrics }
    >();

    // Add saved locations from store
    for (const loc of locations) {
      const key = normalizeLocationKey(loc.name);
      if (!key) continue;

      const metric = venueMetricsByKey.get(key);
      const sessionCount = metric?.count || 0;
      const topGame = metric ? Object.values(metric.gameCounts).sort((a, b) => b.count - a.count)[0] : undefined;
      const lastPlayedDate = metric?.lastDate;

      const existing = keyMap.get(key);
      if (!existing) {
        keyMap.set(key, {
          ...loc,
          name: loc.name.trim().normalize('NFC').replace(/\s+/g, ' '),
          playCount: sessionCount,
          metrics: {
            sessionCount,
            topGame,
            lastPlayedDate,
          },
        });
      } else {
        if (!existing.address && loc.address) existing.address = loc.address;
        if (!existing.notes && loc.notes) existing.notes = loc.notes;
        if (loc.isDefault) existing.isDefault = true;
      }
    }

    // Include distinct historical venues from sessions not yet in store presets
    for (const [key, metric] of venueMetricsByKey.entries()) {
      if (!keyMap.has(key)) {
        const repName = Array.from(metric.rawNames)[0] || key;
        const topGame = Object.values(metric.gameCounts).sort((a, b) => b.count - a.count)[0];
        keyMap.set(key, {
          id: `hist-${key}`,
          name: repName.normalize('NFC').replace(/\s+/g, ' '),
          playCount: metric.count,
          isDefault: false,
          createdAt: metric.lastDate || new Date().toISOString(),
          metrics: {
            sessionCount: metric.count,
            topGame,
            lastPlayedDate: metric.lastDate,
          },
        });
      }
    }

    // Sort using sortVenuesByPlayCount (play count descending, tie-break A-Z 'vi')
    return sortVenuesByPlayCount(Array.from(keyMap.values()));
  }, [locations, venueMetricsByKey]);

  // 4. Filtered venues based on search query
  const filteredVenues = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return combinedVenues;
    return combinedVenues.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );
  }, [combinedVenues, locationSearch]);

  // 5. Location summary statistics
  const locationStats = useMemo(() => {
    const topVenue = combinedVenues[0]; // Already sorted descending by playCount
    const defaultLoc = combinedVenues.find((l) => l.isDefault);

    return {
      totalVenues: combinedVenues.length,
      topVenueName: topVenue && topVenue.playCount > 0 ? topVenue.name : null,
      topVenueCount: topVenue ? topVenue.playCount : 0,
      defaultVenueName: defaultLoc ? defaultLoc.name : null,
    };
  }, [combinedVenues]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)]">
              Players &amp; Venues
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage your tabletop crew, head-to-head records, and favorite game night venues
            </p>
          </div>

          {/* Subtab Navigation Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
            <button
              type="button"
              onClick={() => handleTabChange('players')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-95',
                activeTab === 'players'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-2)]'
              )}
            >
              <Users className="w-4 h-4" />
              <span>Players</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[11px] font-extrabold',
                  activeTab === 'players'
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--card-2)] text-[var(--muted)]'
                )}
              >
                {formatNumber(players.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('locations')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-95',
                activeTab === 'locations'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-2)]'
              )}
            >
              <MapPin className="w-4 h-4" />
              <span>Venues</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[11px] font-extrabold',
                  activeTab === 'locations'
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--card-2)] text-[var(--muted)]'
                )}
              >
                {formatNumber(combinedVenues.length)}
              </span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUBTAB 1: PLAYERS TAB                                   */}
        {/* ======================================================== */}
        {activeTab === 'players' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Action Bar for Players */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)]">
              <div className="text-xs text-[var(--text-secondary)]">
                Total of <strong className="text-[var(--text-primary)]">{formatNumber(players.length)}</strong> players in your tabletop crew.
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant={compareMode ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    if (compareMode && selectedCompareIds.length >= 2) {
                      setIsCompareModalOpen(true);
                    } else {
                      setCompareMode((c) => !c);
                      setSelectedCompareIds(players.slice(0, 2).map((p) => p.id));
                    }
                  }}
                >
                  <Swords className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 mr-1" />
                  {compareMode
                    ? `Compare (${selectedCompareIds.length})`
                    : 'Head-to-Head Compare'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddPlayerModalOpen(true)}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Add Player
                </Button>
              </div>
            </div>

            {/* Compare Mode Banner */}
            {compareMode && (
              <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line-2)] shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <p className="text-xs sm:text-sm text-[var(--ink)] font-semibold">
                  Select 2 or more players below to inspect head-to-head records.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCompareMode(false);
                      setSelectedCompareIds([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selectedCompareIds.length < 2}
                    onClick={() => setIsCompareModalOpen(true)}
                  >
                    Open Comparison ({selectedCompareIds.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Players Grid */}
            {sortedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedPlayers.map((player) => {
                  const pStat = playerStatsMap[player.id] || { totalGames: 0, wins: 0, winRate: 0 };
                  const totalGames = pStat.totalGames;
                  const winRate = pStat.winRate;

                  const isSelectedForCompare = selectedCompareIds.includes(player.id);
                  const playStyleInfo = getPlayStyleInfo(player.playStyle);

                  return (
                    <div
                      key={player.id}
                      className="transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99] h-full"
                    >
                      <Card
                        className={cn(
                          'p-5 flex flex-col justify-between gap-4 relative h-full transition-all group border-2',
                          isSelectedForCompare
                            ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                            : 'hover:border-amber-400/40'
                        )}
                      >
                        {/* Top Right Actions */}
                        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
                          {compareMode ? (
                            <button
                              type="button"
                              aria-label={`Select ${player.name} for comparison`}
                              onClick={() => toggleComparePlayer(player.id)}
                              className={cn(
                                'w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors',
                                isSelectedForCompare
                                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-ink)] font-bold'
                                  : 'bg-[var(--card-2)] border-[var(--line-2)] text-transparent'
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Edit ${player.name}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingPlayer(player);
                              }}
                              className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Player Info Link */}
                        <Link
                          to={`/players/${player.id}`}
                          className="flex items-start gap-3.5 pr-12"
                        >
                          <div className="relative shrink-0">
                            <PlayerAvatar player={player} size="lg" />
                            <span
                              style={{ backgroundColor: player.color }}
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-card)]"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h2 className="font-display font-bold text-base sm:text-lg text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                              {player.name}
                            </h2>

                            {player.nickname && (
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
                                "{player.nickname}"
                              </p>
                            )}

                            {playStyleInfo ? (
                              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                                <span>{playStyleInfo.emoji}</span>
                                <span className="truncate">{playStyleInfo.tagline}</span>
                              </div>
                            ) : (
                              <span
                                style={{ color: player.color }}
                                className="text-[11px] font-semibold mt-0.5 block"
                              >
                                Tabletop Player
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Bio Snippet if exists */}
                        {player.bio && (
                          <p className="text-xs text-[var(--text-muted)] italic line-clamp-1 flex items-center gap-1">
                            <Quote className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>"{player.bio}"</span>
                          </p>
                        )}

                        {/* Played & Win Rate Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border-subtle)] tabular-nums">
                          <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] text-center">
                            <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                              <Gamepad2 className="w-3 h-3 text-[var(--accent-neon)]" />
                              Comp. Plays
                            </span>
                            <p className="font-display font-extrabold text-lg text-[var(--text-primary)] mt-0.5">
                              {formatNumber(totalGames)}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] text-center">
                            <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              Comp. Win Rate
                            </span>
                            <p className="font-display font-extrabold text-lg text-[var(--good)] mt-0.5">
                              {winRate}%
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/players/${player.id}`}
                          className="text-xs font-semibold text-[var(--accent)] group-hover:underline transition-colors flex items-center justify-between"
                        >
                          <span>View Full Profile</span>
                          <span>→</span>
                        </Link>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-3xl mx-auto">
                  👥
                </div>
                <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                  No Players Found
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Add your gaming friends and family to begin tracking scores, rivals, and win rates.
                </p>
                <Button variant="primary" onClick={() => setIsAddPlayerModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Add First Player
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 2: LOCATIONS TAB                                 */}
        {/* ======================================================== */}
        {activeTab === 'locations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Location Overview Highlights Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] flex items-center gap-3.5 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-[var(--text-secondary)] font-medium block">
                    Total Venues
                  </span>
                  <p className="text-xl font-display font-extrabold text-[var(--text-primary)] tabular-nums">
                    {formatCount(locationStats.totalVenues, 'venue')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] flex items-center gap-3.5 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Dices className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-[var(--text-secondary)] font-medium block">
                    Most Played Venue
                  </span>
                  <p className="text-sm font-display font-bold text-[var(--text-primary)] truncate">
                    {locationStats.topVenueName
                      ? `${locationStats.topVenueName} (${formatNumber(locationStats.topVenueCount)} plays)`
                      : 'No data yet'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] flex items-center gap-3.5 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-[var(--text-secondary)] font-medium block">
                    Default Venue
                  </span>
                  <p className="text-sm font-display font-bold text-[var(--text-primary)] truncate">
                    {locationStats.defaultVenueName || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Action Bar: Search & Add Button */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search venue by name, address, district, notes..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
                {locationSearch && (
                  <button
                    type="button"
                    onClick={() => setLocationSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    syncHistoricalLocations(sessions, true);
                  }}
                  title="Sync all historical venues from play sessions"
                  className="text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[var(--accent-neon)]" />
                  Sync History
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingLocation(null);
                    setIsLocationModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add New Venue
                </Button>
              </div>
            </div>

            {/* Locations Grid */}
            {filteredVenues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVenues.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    metrics={loc.metrics}
                    onEdit={(targetLoc) => {
                      setEditingLocation(targetLoc);
                      setIsLocationModalOpen(true);
                    }}
                    onDelete={(id) => {
                      if (id.startsWith('hist-')) {
                        const found = combinedVenues.find((v) => v.id === id);
                        if (found) {
                          clearSessionsAtLocation(found.name);
                        }
                        return;
                      }
                      deleteLocation(id);
                    }}
                    onSetDefault={(id) => {
                      if (id.startsWith('hist-')) {
                        const found = combinedVenues.find((v) => v.id === id);
                        if (found) {
                          const created = addLocation(found.name, found.address, found.notes, true);
                          setDefaultLocation(created.id);
                          return;
                        }
                      }
                      setDefaultLocation(id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-3xl mx-auto">
                  📍
                </div>
                <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                  {locationSearch ? 'No Venues Found' : 'No Venues Saved Yet'}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {locationSearch
                    ? `No venues match "${locationSearch}". Try another keyword or add a new one.`
                    : 'Save your favorite tabletop cafes, friends’ apartments, or clubs for quick 1-tap logging.'}
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingLocation(null);
                    setIsLocationModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Venue
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODALS                                                   */}
        {/* ======================================================== */}
        {/* Player Form Modal (Add & Edit) */}
        <PlayerFormModal
          isOpen={isAddPlayerModalOpen || editingPlayer !== null}
          player={editingPlayer}
          onClose={() => {
            setIsAddPlayerModalOpen(false);
            setEditingPlayer(null);
          }}
        />

        {/* Player Compare Modal */}
        <PlayerCompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          players={selectedComparePlayers}
          sessions={sessions}
        />

        {/* Location Form Modal (Add & Edit) */}
        <LocationFormModal
          isOpen={isLocationModalOpen}
          location={editingLocation}
          onClose={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
          }}
        />
      </div>
    </PageTransition>
  );
};

export default PlayersPage;
