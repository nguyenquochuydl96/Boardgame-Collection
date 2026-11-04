import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { SessionCard } from '../components/session/SessionCard';
import { Button } from '../components/ui/Button';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatMonthYear } from '../lib/utils';
import { PlaySession } from '../types';

export const SessionsPage: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const groupedByMonth = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
    );

    const groups: Array<{ monthLabel: string; items: PlaySession[] }> = [];
    for (const s of sorted) {
      const label = formatMonthYear(s.datePlayed);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.monthLabel !== label) {
        groups.push({ monthLabel: label, items: [s] });
      } else {
        lastGroup.items.push(s);
      }
    }
    return groups;
  }, [sessions]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Play Sessions
            </h1>
            <p className="text-sm text-[#94a3b8] tabular-nums">
              {sessions.length} recorded tabletop battles
            </p>
          </div>

          <Link to="/sessions/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" />
              New Session
            </Button>
          </Link>
        </div>

        {groupedByMonth.length > 0 ? (
          <div className="space-y-8">
            {groupedByMonth.map((group) => (
              <section key={group.monthLabel} className="space-y-3">
                <div className="sticky top-14 lg:top-0 z-20 py-2 px-3 rounded-xl bg-[#0f0f1a]/90 backdrop-blur-md border border-white/[0.06] inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#a78bfa]" />
                  <h2 className="font-display font-bold text-sm text-[#f1f5f9]">
                    {group.monthLabel}
                  </h2>
                  <span className="text-xs font-mono text-[#94a3b8] tabular-nums">
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
          </div>
        ) : (
          <div className="py-16 px-4 text-center rounded-3xl bg-[#16162a]/70 border border-white/[0.08] max-w-lg mx-auto space-y-4">
            <svg
              className="w-24 h-24 mx-auto"
              viewBox="0 0 120 120"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r="42"
                fill="#1e1e35"
                stroke="#22d3ee"
                strokeWidth="3"
              />
              <polygon points="52,44 78,60 52,76" fill="#a78bfa" />
            </svg>
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-white">
                No Play Sessions Yet
              </h2>
              <p className="text-sm text-[#94a3b8]">
                Start your first game night wizard to spin the first-player wheel and record scores.
              </p>
            </div>
            <Link to="/sessions/new">
              <Button variant="primary">
                <Plus className="w-4 h-4" />
                Log First Session
              </Button>
            </Link>
          </div>
        )}

        {/* FAB "+ New Session" */}
        <Link
          to="/sessions/new"
          aria-label="New play session"
          className="fixed right-5 bottom-20 lg:bottom-8 z-30 min-h-[52px] px-5 rounded-2xl bg-[image:var(--gradient-hero)] text-white font-display font-bold text-sm shadow-xl shadow-[#7c3aed]/40 inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span>New Session</span>
        </Link>
      </div>
    </PageTransition>
  );
};

export default SessionsPage;
