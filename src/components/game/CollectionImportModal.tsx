import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Sparkles,
  User,
  Database,
  Gamepad2,
  Users,
  Trophy,
  Archive,
  Download,
  HardDriveDownload,
  ArrowDownUp,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../ui/cn';
import {
  parseImportFile,
  parseBGCatalogZip,
  parseBGCatalogJsonObject,
  ImportPreviewItem,
  FullBGCatalogImportResult,
} from '../../lib/importer';
import { importBGGCollection } from '../../lib/bgg';
import { useGameStore } from '../../store/useGameStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useLocationStore } from '../../store/useLocationStore';
import { createGameCoverDataUri } from '../../lib/utils';
import { exportVaultJSON, exportGamesCSV, exportSessionsCSV } from '../../lib/exportVault';
import { GameStatus } from '../../types';
import { PoweredByBGG } from '../ui/PoweredByBGG';

export interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'import' | 'export' | 'file' | 'bgg';
}

export const CollectionImportModal: React.FC<CollectionImportModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const addGame = useGameStore((s) => s.addGame);
  const bulkAddGames = useGameStore((s) => s.bulkAddGames);
  const bulkAddPlayers = usePlayerStore((s) => s.bulkAddPlayers);
  const bulkAddSessions = useSessionStore((s) => s.bulkAddSessions);
  const bulkAddLocations = useLocationStore((s) => s.bulkAddLocations);
  const games = useGameStore((s) => s.games);
  const players = usePlayerStore((s) => s.players);
  const sessions = useSessionStore((s) => s.sessions);
  const locations = useLocationStore((s) => s.locations);

  const resolveTab = (tab?: 'import' | 'export' | 'file' | 'bgg'): 'import' | 'export' => {
    if (tab === 'export') return 'export';
    return 'import';
  };

  const [activeTab, setActiveTab] = useState<'import' | 'export'>(() => resolveTab(initialTab));

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [isOpen, initialTab]);
  const [bggUsername, setBggUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple game preview list (from CSV or basic JSON)
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);

  // Full backup result (from BG Catalog ZIP or complete JSON)
  const [fullBackup, setFullBackup] =
    useState<FullBGCatalogImportResult | null>(null);
  const [importOptions, setImportOptions] = useState({
    games: true,
    players: true,
    sessions: true,
    locations: true,
    replaceExisting: true,
  });

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);
    setPreviewItems([]);
    setFullBackup(null);
    setLoading(true);

    try {
      const fileName = file.name.toLowerCase();

      // Case 1: ZIP file (e.g. BGGCatalogExport_*.zip)
      if (fileName.endsWith('.zip')) {
        const result = await parseBGCatalogZip(file);
        setFullBackup(result);
        setLoading(false);
        return;
      }

      // Case 2: JSON file
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Check if it's our own BoardGameVault full backup
        if (parsed.vaultBackup === true || (parsed.games && parsed.sessions && parsed.players)) {
          const result: FullBGCatalogImportResult = {
            games: parsed.games || [],
            players: parsed.players || [],
            sessions: parsed.sessions || [],
            locations: parsed.locations || [],
            summary: {
              gameCount: parsed.games?.length || 0,
              playCount: parsed.sessions?.length || 0,
              playerCount: parsed.players?.length || 0,
              locationCount: parsed.locations?.length || 0,
              ownCount: (parsed.games || []).filter((g: any) => g.status === 'own').length,
              rentedCount: (parsed.games || []).filter((g: any) => g.status === 'rented').length,
              soldCount: (parsed.games || []).filter((g: any) => g.status === 'sold').length,
              prevOwnedCount: (parsed.games || []).filter((g: any) => g.status === 'prev_owned').length,
              wishlistCount: (parsed.games || []).filter((g: any) => g.status === 'wishlist').length,
            },
          };
          setFullBackup(result);
          setLoading(false);
          return;
        }

        // Check if it's a full BG Catalog export object
        if (parsed.games && (parsed.plays || parsed.players)) {
          const result = parseBGCatalogJsonObject(parsed);
          setFullBackup(result);
          setLoading(false);
          return;
        }

        // Otherwise treat as simple games list
        const items = parseImportFile(text);
        if (items.length > 0) {
          setPreviewItems(items);
        } else {
          setError('Could not find games in this JSON file.');
        }
        setLoading(false);
        return;
      }

      // Case 3: CSV file
      const text = await file.text();
      const items = parseImportFile(text);
      if (items.length > 0) {
        setPreviewItems(items);
      } else {
        setError(
          'Could not find boardgames in this CSV file. Please verify the column headers.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error parsing file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Full BG Catalog Import (1-Click Restore)
  const handleExecuteFullRestore = () => {
    if (!fullBackup) return;

    const { games, players, sessions, summary } = fullBackup;
    const replace = importOptions.replaceExisting;

    if (importOptions.games && games.length > 0) {
      bulkAddGames(games, replace);
    }

    if (importOptions.players && players.length > 0) {
      bulkAddPlayers(players, replace);
    }

    if (importOptions.sessions && sessions.length > 0) {
      bulkAddSessions(sessions, replace);
    }

    if (importOptions.locations && fullBackup.locations && fullBackup.locations.length > 0) {
      bulkAddLocations(fullBackup.locations, replace);
    }

    setSuccessMessage(
      `Successfully restored ${importOptions.games ? `${summary.gameCount} board games, ` : ''}${importOptions.players ? `${summary.playerCount} players, ` : ''}${importOptions.sessions ? `${summary.playCount} sessions, ` : ''}${importOptions.locations && summary.locationCount ? `${summary.locationCount} locations` : ''} into Vault!`
    );
    setFullBackup(null);
  };

  // Handle BGG Username Sync
  const handleFetchBGG = async () => {
    if (!bggUsername.trim()) {
      setError('Please enter a BoardGameGeek username.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const items = await importBGGCollection(bggUsername.trim());
      if (items.length === 0) {
        setError(`No owned games found for BGG user "${bggUsername}".`);
      } else {
        const preview: ImportPreviewItem[] = items.map((g) => ({
          name: g.name,
          bggId: g.bggId,
          yearPublished: g.yearPublished,
          minPlayers: g.minPlayers,
          maxPlayers: g.maxPlayers,
          playingTime: g.playingTime,
          bggRating: g.bggRating,
          status: 'own' as GameStatus,
          thumbnail: g.image || g.thumbnail,
          selected: true,
        }));
        setPreviewItems(preview);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync BGG collection.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection for simple list
  const toggleItem = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAll = () => {
    const allSelected = previewItems.every((i) => i.selected);
    setPreviewItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  // Execute Simple Import
  const handleExecuteSimpleImport = () => {
    const selected = previewItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    for (const item of selected) {
      const cover =
        item.thumbnail ||
        createGameCoverDataUri(
          item.name,
          `Strategy · ${item.yearPublished || 2024}`,
          ['#7c3aed', '#2563eb', '#22d3ee'],
          'hex'
        );

      addGame({
        name: item.name,
        bggId: item.bggId,
        yearPublished: item.yearPublished || 2024,
        minPlayers: item.minPlayers,
        maxPlayers: item.maxPlayers,
        playingTime: item.playingTime,
        bggRating: item.bggRating,
        status: item.status,
        purchasePrice: item.purchasePrice,
        lentToName: item.lentToName,
        notes: item.notes,
        thumbnail: cover,
        image: cover,
        description: `${item.name} imported into collection.`,
      });
    }

    setSuccessMessage(`Successfully added ${selected.length} board games to collection!`);
    setPreviewItems([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import & Export Collection"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 text-sm">
        {/* Unified 2 Tabs Header */}
        <div className="flex p-1 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setError(null);
              setSuccessMessage(null);
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
              activeTab === 'import'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--hover-bg)]'
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Import (File / BGG)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setError(null);
              setSuccessMessage(null);
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
              activeTab === 'export'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--hover-bg)]'
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Export &amp; Backup
          </button>
        </div>

        {/* Tab 1: Import Content */}
        {activeTab === 'import' && !fullBackup && previewItems.length === 0 && (
          <div className="space-y-4">
            {/* File Upload Box */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--line-strong)] hover:border-[var(--accent)] bg-[var(--card-2)] text-center space-y-3 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)] mx-auto flex items-center justify-center">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-[var(--ink)] text-base">
                  Drag and drop backup files here
                </p>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
                  Supports <strong className="text-[var(--ink)]">.ZIP</strong> or{' '}
                  <strong className="text-[var(--ink)]">.JSON</strong> backups from BG Catalog (iOS) or BoardGame Vault, and <strong className="text-[var(--ink)]">.CSV</strong> catalogs. Automatically restores games, players, venues, and play sessions!
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.json,.csv,.txt,application/json,application/zip,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold shadow hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Choose File (.zip / .json / .csv)
                </button>
              </div>
              {loading && (
                <p className="text-xs text-[var(--accent)] animate-pulse font-semibold">
                  Reading and parsing backup archive...
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[var(--line)]"></div>
              <span className="flex-shrink mx-3 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                or sync directly from BoardGameGeek
              </span>
              <div className="flex-grow border-t border-[var(--line)]"></div>
            </div>

            {/* BGG Fetch Section */}
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--muted)] font-medium">
                  Enter your public BoardGameGeek username to fetch all owned games:
                </p>
                <PoweredByBGG variant="inline" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="e.g. your_bgg_username"
                    value={bggUsername}
                    onChange={(e) => setBggUsername(e.target.value)}
                    leftIcon={<Database className="w-4 h-4 text-[var(--accent)]" />}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleFetchBGG}
                  disabled={loading || !bggUsername.trim()}
                >
                  {loading ? 'Fetching...' : 'Fetch Games'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FULL BG CATALOG BACKUP PREVIEW CARD */}
        {fullBackup && (
          <div className="p-5 rounded-2xl bg-[var(--card-2)] border border-[var(--accent)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center text-xl shadow-md">
                  🎉
                </div>
                <div>
                  <h4 className="font-bold text-[var(--ink)] text-sm">
                    Complete BG Catalog Backup Detected!
                  </h4>
                  <p className="text-xs text-[var(--muted)]">
                    This export contains your games library, player profiles, locations, and tabletop match history.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-sky-500 font-bold">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Board Games</span>
                </div>
                <p className="text-2xl font-black text-[var(--ink)] tabular-nums">
                  {fullBackup.summary.gameCount}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  {fullBackup.summary.ownCount} owned{Boolean(fullBackup.summary.rentedCount) ? ' · ' + fullBackup.summary.rentedCount + ' rented' : ''} · {fullBackup.summary.soldCount} sold
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-purple-500 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Players</span>
                </div>
                <p className="text-2xl font-black text-[var(--ink)] tabular-nums">
                  {fullBackup.summary.playerCount}
                </p>
                <p className="text-[10px] text-[var(--muted)] truncate">
                  {fullBackup.players.map((p) => p.name).slice(0, 3).join(', ')}...
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
                  <Trophy className="w-4 h-4" />
                  <span>Sessions Played</span>
                </div>
                <p className="text-2xl font-black text-[var(--ink)] tabular-nums">
                  {fullBackup.summary.playCount}
                </p>
                <p className="text-[10px] text-[var(--muted)]">With scores &amp; winners</p>
              </div>
            </div>

            {/* Options */}
            <div className="pt-2 border-t border-[var(--line)] space-y-2 text-xs">
              <p className="font-bold text-[var(--ink)]">Import options:</p>
              <div className="flex flex-wrap gap-4 text-[var(--muted)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.games}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, games: e.target.checked }))
                    }
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Import {fullBackup.summary.gameCount} Games</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.players}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, players: e.target.checked }))
                    }
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Import {fullBackup.summary.playerCount} Players</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.sessions}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, sessions: e.target.checked }))
                    }
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Import {fullBackup.summary.playCount} Sessions</span>
                </label>
                {fullBackup.locations && fullBackup.locations.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.locations}
                      onChange={(e) =>
                        setImportOptions((o) => ({ ...o, locations: e.target.checked }))
                      }
                      className="rounded text-[var(--accent)]"
                    />
                    <span>Import {fullBackup.locations.length} Locations</span>
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <Button variant="ghost" size="sm" onClick={() => setFullBackup(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteFullRestore}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Restore All Data
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Export & Backup */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Full Backup Box */}
            <div className="p-5 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-md shrink-0">
                    <HardDriveDownload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-[var(--ink)]">
                      Full Collection Backup (.JSON)
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Export a complete archive containing Games, Players, Venues &amp; Session History. Use this to safely backup or migrate across devices.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)] block font-medium">Games</span>
                  <span className="font-display font-black text-lg text-[var(--ink)]">{games.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)] block font-medium">Players</span>
                  <span className="font-display font-black text-lg text-[var(--accent)]">{players.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)] block font-medium">Sessions</span>
                  <span className="font-display font-black text-lg text-amber-500">{sessions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)] block font-medium">Venues</span>
                  <span className="font-display font-black text-lg text-emerald-500">{locations.length}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center py-3 text-sm font-bold shadow-md"
                onClick={() => {
                  exportVaultJSON();
                  setSuccessMessage('Boardgame Vault JSON backup downloaded successfully!');
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Full Archive (.JSON)
              </Button>
            </div>

            {/* Export CSV for Excel / Sheets */}
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                  Export CSV Spreadsheets (Excel / Google Sheets)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    exportGamesCSV();
                    setSuccessMessage('Exported Games catalog to CSV successfully!');
                  }}
                  className="p-3 rounded-xl bg-[var(--card)] hover:bg-[var(--hover-bg)] border border-[var(--line)] text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--ink)] block">Export Games Catalog</span>
                    <span className="text-[11px] text-[var(--muted)]">{games.length} games</span>
                  </div>
                  <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportSessionsCSV();
                    setSuccessMessage('Exported Play Sessions to CSV successfully!');
                  }}
                  className="p-3 rounded-xl bg-[var(--card)] hover:bg-[var(--hover-bg)] border border-[var(--line)] text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--ink)] block">Export Session Logs</span>
                    <span className="text-[11px] text-[var(--muted)]">{sessions.length} sessions</span>
                  </div>
                  <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {/* Simple Game Preview List */}
        {previewItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                Found <strong className="text-[var(--ink)]">{previewItems.length}</strong> games (
                {previewItems.filter((i) => i.selected).length} selected)
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[var(--accent)] hover:underline cursor-pointer font-bold"
              >
                {previewItems.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-[var(--line)] p-2 bg-[var(--card)]">
              {previewItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleItem(idx)}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                    item.selected
                      ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/40 text-[var(--ink)]'
                      : 'opacity-60 hover:opacity-100 hover:bg-[var(--hover-bg)]'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => {}}
                    className="rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-9 h-11 object-cover rounded bg-[var(--card-2)] border border-[var(--line)]"
                    />
                  ) : (
                    <div className="w-9 h-11 rounded bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-center text-xs text-[var(--muted)]">
                      🎲
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--ink)] text-xs truncate">{item.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {item.yearPublished || 'N/A'} · {item.minPlayers}-{item.maxPlayers} players · Status: {item.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="ghost" size="sm" onClick={() => setPreviewItems([])}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteSimpleImport}
                disabled={!previewItems.some((i) => i.selected)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Import {previewItems.filter((i) => i.selected).length} Games
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CollectionImportModal;
