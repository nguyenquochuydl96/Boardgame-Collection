import { useGameStore } from '../store/useGameStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { useLocationStore } from '../store/useLocationStore';
import { BoardGame, Player, PlaySession, GameLocation } from '../types';

export interface VaultBackupData {
  app: 'BoardGameVault';
  vaultBackup: true;
  version: '2.0';
  exportedAt: string;
  counts: {
    games: number;
    players: number;
    sessions: number;
    locations: number;
  };
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations: GameLocation[];
}

/**
 * Trigger file download in browser
 */
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export 100% full JSON backup of the entire Vault
 */
export function exportVaultJSON(): VaultBackupData {
  const games = useGameStore.getState().games;
  const players = usePlayerStore.getState().players;
  const sessions = useSessionStore.getState().sessions;
  const locations = useLocationStore.getState().locations;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const payload: VaultBackupData = {
    app: 'BoardGameVault',
    vaultBackup: true,
    version: '2.0',
    exportedAt: new Date().toISOString(),
    counts: {
      games: games.length,
      players: players.length,
      sessions: sessions.length,
      locations: locations.length,
    },
    games,
    players,
    sessions,
    locations,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  downloadFile(
    jsonStr,
    `BoardGameVault_Backup_${timestamp}.json`,
    'application/json;charset=utf-8'
  );

  return payload;
}

/**
 * Export Games Collection to CSV
 */
export function exportGamesCSV() {
  const games = useGameStore.getState().games;
  const headers = [
    'ID',
    'Name',
    'Status',
    'Year',
    'Min Players',
    'Max Players',
    'Playtime (min)',
    'BGG Rating',
    'Purchase Price (VND)',
    'Lent To',
    'Tags',
    'Notes',
  ];

  const rows = games.map((g) => [
    `"${g.id}"`,
    `"${(g.name || '').replace(/"/g, '""')}"`,
    `"${g.status}"`,
    g.yearPublished ?? '',
    g.minPlayers ?? '',
    g.maxPlayers ?? '',
    g.playingTime ?? '',
    g.bggRating ?? '',
    g.purchasePrice ?? '',
    `"${(g.lentToName || '').replace(/"/g, '""')}"`,
    `"${(g.tags || []).join(', ')}"`,
    `"${(g.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `BoardGameVault_Games_${timestamp}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export Sessions to CSV
 */
export function exportSessionsCSV() {
  const sessions = useSessionStore.getState().sessions;
  const headers = [
    'Session ID',
    'Game Name',
    'Date Played',
    'Duration (min)',
    'Location',
    'Winner',
    'Players & Scores',
    'Notes',
  ];

  const rows = sessions.map((s) => {
    const winnerPlayer = s.players.find((p) => p.isWinner || p.playerId === s.winnerId);
    const playersSummary = s.players
      .map((p) => `${p.playerName}: ${typeof p.score === 'number' ? p.score : 'N/A'}`)
      .join('; ');

    return [
      `"${s.id}"`,
      `"${(s.gameName || '').replace(/"/g, '""')}"`,
      `"${s.datePlayed}"`,
      s.durationMinutes ?? '',
      `"${(s.location || '').replace(/"/g, '""')}"`,
      `"${(winnerPlayer?.playerName || '').replace(/"/g, '""')}"`,
      `"${playersSummary.replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `BoardGameVault_Sessions_${timestamp}.csv`, 'text/csv;charset=utf-8');
}
