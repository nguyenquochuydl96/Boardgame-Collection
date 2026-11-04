import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Search, Filter, ChevronDown, Gamepad2, User } from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { SessionCard } from '../components/session/SessionCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatMonthYear } from '../lib/utils';
import { PlaySession } from '../types';
import { cn } from '../components/ui/cn';

const PAGE_SIZE = 30;

export const SessionsPage: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  // Extract available years
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
        // Search filter
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

        // Player filter
        if (selectedPlayerId !== 'all') {
          if (!s.players?.some((p) => p.playerId === selectedPlayerId)) {
            return false;
          }
        }

        // Year filter
        if (selectedYear !== 'all') {
          const y = new Date(s.datePlayed).getFullYear();
          if (String(y) !== selectedYear) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
      );
  }, [sessions, searchQuery, selectedPlayerId, selectedYear]);

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPlayerId('all');
    setSelectedYear('all');
    setVisibleCount(PAGE_SIZE);
  };

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

          <Link to="/sessions/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Tạo Ván Mới
            </Button>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Tìm theo tên game, người chơi, quán cafe..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
              />
            </div>

            {/* Filter by Player */}
            <div className="sm:w-48">
              <select
                aria-label="Lọc theo người chơi"
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer appearance-none"
              >
                <option value="all">👥 Tất cả người chơi</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Year */}
            <div className="sm:w-36">
              <select
                aria-label="Lọc theo năm"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer appearance-none"
              >
                <option value="all">📅 Tất cả năm</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Năm {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Active Filters Summary */}
          {(searchQuery || selectedPlayerId !== 'all' || selectedYear !== 'all') && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              <span>
                Tìm thấy <strong className="text-[var(--text-primary)]">{filteredSessions.length}</strong> ván phù hợp
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[var(--accent-neon)] hover:underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
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
                {searchQuery || selectedPlayerId !== 'all' || selectedYear !== 'all'
                  ? 'Không có ván chơi nào khớp với bộ lọc hiện tại của bạn.'
                  : 'Chưa có lịch sử ván chơi nào được ghi nhận. Hãy tạo ván chơi đầu tiên!'}
              </p>
            </div>
            {(searchQuery || selectedPlayerId !== 'all' || selectedYear !== 'all') ? (
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
      </div>
    </PageTransition>
  );
};

export default SessionsPage;
