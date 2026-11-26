import type { SessionDraft } from '../types';

export const DRAFT_STORAGE_KEY = 'boardgame_session_draft';
export const SESSION_STORAGE_KEY = 'bg-vault-sessions-v2';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type WriteResult = { status: 'saved'; raw: string } | { status: 'blocked' } | { status: 'conflict' };

/** Storage is injected so all wizard flush paths share the same guard. */
export function writeDraftIfSafe(
  storage: DraftStorage,
  draft: SessionDraft,
  expected: string | null,
  pendingDecision: boolean,
): WriteResult {
  if (pendingDecision) return { status: 'blocked' };
  if (storage.getItem(DRAFT_STORAGE_KEY) !== expected) return { status: 'conflict' };
  const raw = JSON.stringify(draft);
  storage.setItem(DRAFT_STORAGE_KEY, raw);
  return { status: 'saved', raw };
}

/** Never remove a draft other than the exact one the user saw or this wizard wrote. */
export function removeDraftIfUnchanged(storage: DraftStorage, expected: string | null): boolean {
  if (expected === null || storage.getItem(DRAFT_STORAGE_KEY) !== expected) return false;
  storage.removeItem(DRAFT_STORAGE_KEY);
  return true;
}

/** Read older draft shapes without expiring them or guessing that they are complete. */
export function parseSessionDraft(raw: string | null, now: number): SessionDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const draft = { ...value } as SessionDraft;
    if (typeof draft.gameId !== 'string' || !draft.gameId) return null;
    draft.datePlayed ??= new Date(now).toLocaleDateString('en-CA');
    draft.location ??= '';
    draft.durationMinutes ??= '60';
    draft.elapsedSeconds ??= 0;
    draft.sessionStartTime ??= now - draft.elapsedSeconds * 1000;
    draft.isTimerRunning ??= true;
    draft.pausedDurationMs ??= 0;
    draft.selectedPlayerIds ??= [];
    draft.oneOffPlayers ??= [];
    draft.firstPlayerMethod ??= 'random_wheel';
    draft.firstPlayerAnimStyle ??= 'card_shuffle';
    draft.scoresByPlayerId ??= {};
    draft.breakdownsByPlayerId ??= {};
    draft.manualWinnerIds ??= [];
    draft.lowScoreWins ??= false;
    draft.scoringMode ??= 'quick';
    draft.photos ??= [];
    draft.notes ??= '';
    draft.currentStep ??= 1;
    draft.lastUpdated ??= new Date(now).toISOString();
    return draft;
  } catch {
    return null;
  }
}

/** Save first, verify the existing persisted session store, then conditionally clean up. */
export function saveSessionAndCleanDraft<T extends { id: string }>(
  storage: DraftStorage,
  expected: string | null,
  save: () => T,
): { session: T; durable: boolean; draftRemoved: boolean } {
  const session = save();
  let durable = false;
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    const persisted = raw ? JSON.parse(raw) : null;
    durable = Array.isArray(persisted?.state?.sessions)
      && persisted.state.sessions.some((item: { id?: unknown }) => item?.id === session.id);
  } catch {
    // An unreadable or unavailable persisted store is not proof of a durable save.
  }
  let draftRemoved = false;
  if (durable) {
    try { draftRemoved = removeDraftIfUnchanged(storage, expected); } catch { /* keep the draft */ }
  }
  return { session, durable, draftRemoved };
}
