import { useSyncStore } from '../store/useSyncStore';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLocationStore } from '../store/useLocationStore';

let applyingRemote = false;

// Installed as soon as AppShell imports the guard, not only when auto-sync runs.
// The boolean suppresses only synchronous, deliberate store applications.
useGameStore.subscribe((state, previous) => {
  if (!applyingRemote && state.games !== previous.games) useSyncStore.getState().markLocalChange();
});
useSessionStore.subscribe((state, previous) => {
  if (!applyingRemote && state.sessions !== previous.sessions) useSyncStore.getState().markLocalChange();
});
usePlayerStore.subscribe((state, previous) => {
  if (!applyingRemote && state.players !== previous.players) useSyncStore.getState().markLocalChange();
});
useLocationStore.subscribe((state, previous) => {
  if (!applyingRemote && state.locations !== previous.locations) useSyncStore.getState().markLocalChange();
});

export function setSyncApplyingRemote(val: boolean): void {
  applyingRemote = val;
}

export function isSyncApplyingRemote(): boolean {
  return applyingRemote;
}
