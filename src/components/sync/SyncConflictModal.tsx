import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatNumber } from '../../lib/utils';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLocationStore } from '../../store/useLocationStore';
import { useSyncStore } from '../../store/useSyncStore';
import { runConflictDecision } from './syncStatus';
import type { ConflictChoice } from './syncStatus';

export interface CollectionCounts {
  games: number;
  sessions: number;
  players: number;
  locations: number;
}

export interface SyncConflict {
  reason: string;
  remoteUpdatedAt: string | null;
  remoteCounts?: CollectionCounts;
}

type DestructiveChoice = Exclude<ConflictChoice, 'later'>;

interface ConflictContentProps {
  conflict: SyncConflict;
  localCounts: CollectionCounts;
  confirmation: DestructiveChoice | null;
  busy: boolean;
  error: string | null;
  backupFailed: boolean;
  onChoose: (choice: ConflictChoice) => void;
  onConfirm: (skipBackup?: boolean) => void;
  onBack: () => void;
}

function Counts({ label, counts }: { label: string; counts: CollectionCounts }) {
  return (
    <section className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card-2)] p-3" aria-label={label}>
      <h3 className="font-bold text-sm">{label}</h3>
      <dl className="mt-2 space-y-1 text-sm">
        {(['games', 'sessions', 'players', 'locations'] as const).map((key) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="capitalize">{key}</dt>
            <dd className="font-semibold tabular-nums">{formatNumber(counts[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Pure view, also used by local static-render tests. */
export function SyncConflictContent({ conflict, localCounts, confirmation, busy, error, backupFailed, onChoose, onConfirm, onBack }: ConflictContentProps) {
  const remoteDate = conflict.remoteUpdatedAt ? new Date(conflict.remoteUpdatedAt) : null;
  return (
    <div className="space-y-4 text-[var(--ink)]">
      <p id="sync-conflict-description" className="text-sm leading-relaxed">
        This device and the cloud may have different changes. Sync needs your decision before it can continue.
      </p>
      <p className="text-sm break-words"><strong>Reason:</strong> {conflict.reason}</p>
      <p className="text-sm text-[var(--muted)]">
        Cloud update: {remoteDate && !Number.isNaN(remoteDate.getTime()) ? remoteDate.toLocaleString() : 'Unknown'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Counts label="This device" counts={localCounts} />
        {conflict.remoteCounts ? (
          <Counts label="Cloud collection" counts={conflict.remoteCounts} />
        ) : (
          <section className="rounded-xl border border-[var(--line)] bg-[var(--card-2)] p-3 text-sm">
            <h3 className="font-bold">Cloud collection</h3>
            <p className="mt-2">Cloud counts unavailable</p>
          </section>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl bg-[var(--bad-soft)] p-3 text-sm text-[var(--bad)] break-words">{error}</p>}
      {busy && <p role="status" className="text-sm">Working; please keep this screen open...</p>}
      {confirmation ? (
        <div className="space-y-3 rounded-xl border border-[var(--bad)]/40 p-3">
          <h3 className="font-bold text-sm">{confirmation === 'cloud' ? 'Replace this device?' : 'Replace the cloud collection?'}</h3>
          <p className="text-sm leading-relaxed">
            {confirmation === 'cloud'
              ? 'Using Cloud can replace local changes on this device.'
              : 'Keeping Local can replace changes in the cloud for other devices.'}
            {' '}A JSON backup of this device will be requested first; check that it downloads. It does not back up the cloud collection. The sync engine may also require a protective backup.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="danger" className="w-full min-h-11 whitespace-normal" disabled={busy} onClick={() => onConfirm(false)}>
              {confirmation === 'cloud' ? 'Confirm Use Cloud' : 'Confirm Keep Local'}
            </Button>
            {backupFailed && (
              <Button variant="danger" className="w-full min-h-11 whitespace-normal" disabled={busy} onClick={() => onConfirm(true)}>
                Continue without JSON backup
              </Button>
            )}
            <Button variant="secondary" className="w-full min-h-11" disabled={busy} onClick={onBack}>Back to choices</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button className="w-full min-h-11" disabled={busy} onClick={() => onChoose('cloud')}>Use Cloud</Button>
          <Button variant="secondary" className="w-full min-h-11" disabled={busy} onClick={() => onChoose('local')}>Keep Local</Button>
          <Button variant="ghost" className="w-full min-h-11" disabled={busy} onClick={() => onChoose('later')}>Decide Later</Button>
          <p className="text-xs text-[var(--muted)]">Decide Later keeps the conflict unresolved. Open the cloud status to review it again.</p>
        </div>
      )}
    </div>
  );
}

interface SyncConflictModalProps {
  conflict: SyncConflict;
  onDeferred: () => void;
}

/** Mounted globally while a conflict needs attention. */
export function SyncConflictModal({ conflict, onDeferred }: SyncConflictModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [confirmation, setConfirmation] = useState<DestructiveChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupFailed, setBackupFailed] = useState(false);
  const games = useGameStore((s) => s.games.length);
  const sessions = useSessionStore((s) => s.sessions.length);
  const players = usePlayerStore((s) => s.players.length);
  const locations = useLocationStore((s) => s.locations.length);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const executeChoice = async (choice: ConflictChoice, skipBackup = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setBackupFailed(false);
    try {
      const result = await runConflictDecision(choice, {
        backup: async () => {
          const { exportVaultJSON } = await import('../../lib/exportVault');
          await exportVaultJSON();
        },
        resolve: async (selected) => {
          const module = await import('../../lib/supabaseSync');
          // Fail closed if a mixed-version bundle does not yet expose this API.
          const resolve = (module as unknown as {
            resolveSyncConflict?: (c: ConflictChoice) => Promise<{ success: boolean; error?: string }>;
          }).resolveSyncConflict;
          if (!resolve) throw new Error('Conflict resolution is unavailable in this app version. No overwrite was requested.');
          return resolve(selected);
        },
      }, { skipBackup });
      if (!result.success) {
        setBackupFailed(result.stage === 'backup');
        setError(result.stage === 'backup'
          ? `JSON backup could not be requested: ${result.error}. Retry or explicitly continue without it.`
          : result.error);
      } else if (choice === 'later') {
        onDeferred();
      } else {
        const state = useSyncStore.getState();
        if (state.syncConflict || state.syncStatus === 'conflict') {
          setError('The conflict is still marked unresolved. Review the status and try again.');
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const choose = (choice: ConflictChoice) => {
    if (busyRef.current) return;
    setError(null);
    setBackupFailed(false);
    if (choice === 'later') void executeChoice(choice);
    else setConfirmation(choice);
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="sync-conflict-title"
      aria-describedby="sync-conflict-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busyRef.current) choose('later');
      }}
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-[var(--ink)] shadow-2xl backdrop:bg-black/70 sm:p-6"
    >
      <h2 id="sync-conflict-title" className="mb-4 flex items-center gap-2 text-lg font-bold">
        <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--bad)]" /> Sync conflict
      </h2>
      <SyncConflictContent
        conflict={conflict}
        localCounts={{ games, sessions, players, locations }}
        confirmation={confirmation}
        busy={busy}
        error={error}
        backupFailed={backupFailed}
        onChoose={choose}
        onConfirm={(skipBackup) => { if (confirmation) void executeChoice(confirmation, skipBackup); }}
        onBack={() => { setConfirmation(null); setError(null); setBackupFailed(false); }}
      />
    </dialog>,
    document.body
  );
}
