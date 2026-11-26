export interface SyncStatusInput {
  isEnabled: boolean;
  status: string;
  lastSyncedAt: string | null;
  hasConflict?: boolean;
  hasCompletedInitialPull?: boolean;
  hasKnownBaseline?: boolean;
  pendingChanges?: boolean;
}

export interface SyncStatusView {
  label: string;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
}

/** Connection settings and a previously successful sync do not prove a current sync. */
export function getSyncStatusView({ isEnabled, status, lastSyncedAt, hasConflict, hasCompletedInitialPull = true, hasKnownBaseline = true, pendingChanges = false }: SyncStatusInput): SyncStatusView {
  if (!isEnabled) return { label: 'Cloud Off', tone: 'neutral' };
  if (hasConflict || status === 'conflict') return { label: 'Conflict', tone: 'warn' };
  switch (status) {
    case 'syncing': return { label: 'Syncing', tone: 'neutral' };
    case 'pending': return { label: 'Pending', tone: 'warn' };
    case 'offline': return { label: 'Offline', tone: 'warn' };
    case 'error': return { label: 'Sync Error', tone: 'bad' };
    case 'synced':
      if (pendingChanges) return { label: 'Pending', tone: 'warn' };
      return lastSyncedAt && hasCompletedInitialPull && hasKnownBaseline
        ? { label: 'Synced', tone: 'good' }
        : { label: 'Awaiting Sync', tone: 'neutral' };
    default: return pendingChanges ? { label: 'Pending', tone: 'warn' } : { label: 'Awaiting Sync', tone: 'neutral' };
  }
}

/** Only an explicit reopen or the end of the conflict clears local deferral. */
export function nextConflictPresentation(deferred: boolean, event: 'defer' | 'reopen' | 'clear' | 'update'): boolean {
  if (event === 'defer') return true;
  if (event === 'reopen' || event === 'clear') return false;
  return deferred;
}

export type ConflictChoice = 'cloud' | 'local' | 'later';
export type ConflictResult = { success: true } | { success: false; stage: 'backup' | 'resolution'; error: string };

/** The sync engine remains responsible for its protective backup and actual writes. */
export async function runConflictDecision(
  choice: ConflictChoice,
  dependencies: {
    backup: () => Promise<unknown>;
    resolve: (choice: ConflictChoice) => Promise<{ success: boolean; error?: string }>;
  },
  options: { skipBackup?: boolean } = {}
): Promise<ConflictResult> {
  if (choice !== 'later' && !options.skipBackup) {
    try {
      await dependencies.backup();
    } catch (error) {
      return { success: false, stage: 'backup', error: error instanceof Error ? error.message : 'JSON backup could not be requested.' };
    }
  }

  try {
    const result = await dependencies.resolve(choice);
    if (!result.success) return { success: false, stage: 'resolution', error: result.error || 'Conflict resolution failed.' };
    return { success: true };
  } catch (error) {
    return { success: false, stage: 'resolution', error: error instanceof Error ? error.message : 'Conflict resolution failed.' };
  }
}
