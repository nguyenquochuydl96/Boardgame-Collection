import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Sparkles,
  Database,
  Archive,
  Download,
  HardDriveDownload,
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
} from '../../lib/importer';
import { importBGGCollection } from '../../lib/bgg';
import { useGameStore } from '../../store/useGameStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useLocationStore } from '../../store/useLocationStore';
import { createGameCoverDataUri, getGameThumbnail } from '../../lib/utils';
import { exportVaultJSON, exportGamesCSV, exportSessionsCSV } from '../../lib/exportVault';
import { useSyncStore } from '../../store/useSyncStore';
import { applyValidatedRestore, assertRestorePersisted, getRestoreCounts, getRestorePresence, restoreCategories, validateRestoreData, type RestoreCategory, type RestoreSelection } from '../../lib/restoreValidation';
import { GameStatus } from '../../types';
import { PoweredByBGG } from '../ui/PoweredByBGG';
import { GameCoverImage } from './GameCoverImage';

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
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple game preview list (from CSV or basic JSON)
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);

  // Keep the original categories and their presence; an absent category is not empty.
  const [fullBackup, setFullBackup] = useState<Record<string, unknown> | null>(null);
  const [importOptions, setImportOptions] = useState<RestoreSelection & { replaceExisting: boolean }>({
    games: true, players: true, sessions: true, locations: true, replaceExisting: false,
  });
  const [confirmRestore, setConfirmRestore] = useState(false);
  const syncEnabled = useSyncStore((s) => s.isEnabled);
  const autoSync = useSyncStore((s) => s.autoSync);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const present = getRestorePresence(fullBackup);
  const counts = getRestoreCounts(fullBackup);
  const restoreValidation = fullBackup ? validateRestoreData(fullBackup, importOptions) : null;

  const showBackup = (backup: Record<string, unknown>) => {
    const available = getRestorePresence(backup);
    setFullBackup(backup);
    setImportOptions({ ...available, replaceExisting: false });
    setConfirmRestore(false);
  };

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
        showBackup({ ...result });
        setLoading(false);
        return;
      }

      // Case 2: JSON file
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Do not coerce missing or malformed categories to empty arrays.
          if (parsed.vaultBackup === true || 'sessions' in parsed) {
            showBackup(parsed);
            return;
          }
          if ('plays' in parsed || 'playersPlays' in parsed || ('games' in parsed && 'players' in parsed)) {
            showBackup({ ...parseBGCatalogJsonObject(parsed) });
            return;
          }
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

  // Each localStorage write is verified separately. This is not an atomic restore.
  const handleExecuteFullRestore = () => {
    if (!fullBackup || !confirmRestore) return;
    setError(null);
    setSuccessMessage(null);
    const sync = useSyncStore.getState();
    if ((sync.isEnabled && sync.autoSync) || sync.syncStatus === 'syncing') {
      setError('Turn off automatic sync and wait for any active sync before restoring. In-flight or realtime changes may still occur; disconnect from the network if necessary.');
      return;
    }
    const verify = (key: string, category: RestoreCategory, current: unknown[]) =>
      assertRestorePersisted((storageKey) => window.localStorage.getItem(storageKey), key, category, current);
    const result = applyValidatedRestore(fullBackup, importOptions, importOptions.replaceExisting, {
      games: (data, replace) => { bulkAddGames(data, replace); verify('bg-vault-games-v2', 'games', useGameStore.getState().games); },
      players: (data, replace) => { bulkAddPlayers(data, replace); verify('bg-vault-players-v1', 'players', usePlayerStore.getState().players); },
      sessions: (data, replace) => { bulkAddSessions(data, replace); verify('bg-vault-sessions-v2', 'sessions', useSessionStore.getState().sessions); },
      locations: (data, replace) => { bulkAddLocations(data, replace); verify('boardgame_locations_v2', 'locations', useLocationStore.getState().locations); },
    });
    if (!result.ok) {
      setError(result.errors.slice(0, 5).join('; '));
      setConfirmRestore(false);
      return;
    }
    setSuccessMessage('Selected categories were applied locally and their localStorage values verified. Review the result before re-enabling sync; media availability and interruption recovery are not guaranteed.');
    setFullBackup(null);
    setConfirmRestore(false);
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
      const sharpCover = getGameThumbnail({ name: item.name, bggId: item.bggId, thumbnail: item.thumbnail });
      const cover =
        sharpCover ||
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
        tags: item.tags,
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
                  <strong className="text-[var(--ink)]">.JSON</strong> backups from BG Catalog (iOS) or HEO Board Game Collection, and <strong className="text-[var(--ink)]">.CSV</strong> game catalogs. Preview and confirm backup restores before applying changes.
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

        {/* Validate and preview selected categories before any store changes. */}
        {fullBackup && (
          <div className="p-5 rounded-2xl bg-[var(--card-2)] border border-[var(--accent)] space-y-4">
            <div>
              <h4 className="font-bold text-[var(--ink)]">Backup preview</h4>
              <p className="text-xs text-[var(--muted)]">Select categories to apply. An absent category is not the same as an empty one.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              {restoreCategories.map((category) => (
                <label key={category} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importOptions[category]}
                    disabled={!present[category]}
                    onChange={(event) => {
                      setImportOptions((options) => ({ ...options, [category]: event.target.checked }));
                      setConfirmRestore(false);
                    }}
                  />
                  <span className="capitalize">{category}: {present[category] ? (counts[category] ?? 'invalid') : 'absent'}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={importOptions.replaceExisting} onChange={(event) => {
                setImportOptions((options) => ({ ...options, replaceExisting: event.target.checked }));
                setConfirmRestore(false);
              }} />
              Replace selected categories instead of merging
            </label>
            <div className="rounded-xl border border-[var(--warn)] p-3 text-xs space-y-2">
              <p><strong>Replacement warning:</strong> selected local categories can be overwritten, including when a backup category is empty. Existing store rules preserve guest players and recent sessions; venue filtering/deduplication may omit records. Merging can skip duplicates.</p>
              <p>Storage writes happen separately, not atomically. Closing the app, quota errors, or interruption may leave only some changes applied. There is no automatic rollback. Download a separate backup and keep the original safe before continuing.</p>
              <p>ZIP images are held in memory for preview and restored as embedded data; large files may exceed localStorage quota. Media and cloud consistency are not guaranteed.</p>
              <p>Turn off automatic cloud sync and wait for active sync before restoring. In-flight operations, realtime updates, or other devices can still change data; consider disconnecting from the network. Review local data before re-enabling sync.</p>
            </div>
            <Button variant="secondary" size="sm" disabled={isExporting} onClick={async () => {
              setError(null);
              try {
                setIsExporting(true);
                await exportVaultJSON();
                setSuccessMessage('Pre-restore backup download was requested. Verify the downloaded file before continuing.');
              } catch {
                setError('Could not create the pre-restore backup. No restore was started.');
              } finally { setIsExporting(false); }
            }}>
              <Download className="w-4 h-4 mr-1.5" />{isExporting ? 'Preparing backup...' : 'Download current backup'}
            </Button>
            {restoreValidation && !restoreValidation.ok && (
              <div className="text-xs text-[var(--bad)]" role="alert">
                Invalid selection: {restoreValidation.errors.slice(0, 5).join('; ')}{restoreValidation.errors.length > 5 ? '…' : ''}
              </div>
            )}
            {syncEnabled && autoSync && <p className="text-xs text-[var(--bad)]">Automatic sync is enabled. Turn it off in Cloud Sync before restoring.</p>}
            {syncStatus === 'syncing' && <p className="text-xs text-[var(--bad)]">A sync is active. Wait before restoring.</p>}
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={confirmRestore} onChange={(event) => setConfirmRestore(event.target.checked)} />
              <span>I understand the selected data may be replaced and an interruption can leave a partial restore.</span>
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <Button variant="ghost" size="sm" onClick={() => setFullBackup(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleExecuteFullRestore} disabled={!confirmRestore || !restoreValidation?.ok || isExporting || (syncEnabled && autoSync) || syncStatus === 'syncing'}>
                <Sparkles className="w-4 h-4 mr-1.5" />Apply selected data
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
                  <span className="font-display font-black text-lg text-[var(--accent)]">{locations.length}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center py-3 text-sm font-bold shadow-md"
                disabled={isExporting}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    await exportVaultJSON();
                    setSuccessMessage('HEO Board Game Collection JSON backup downloaded successfully!');
                  } catch (err) {
                    console.error('Failed to export vault backup:', err);
                    setError('Failed to export backup. Please try again.');
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting Archive...' : 'Download Full Archive (.JSON)'}
              </Button>
            </div>

            {/* Export CSV for Excel / Sheets */}
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                  Export CSV Spreadsheets (Excel / Google Sheets)
                </h4>
              </div>
              <p className="text-xs text-[var(--muted)]">Games CSV imports only the columns shown and creates new local IDs; it is not a full backup. Session CSV is a report and cannot restore sessions. Use JSON for backup and recovery.</p>
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
          <div className="p-3 rounded-xl bg-[var(--bad-soft)] border border-[var(--bad)]/30 text-[var(--bad)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-[var(--good-soft)] border border-[var(--good)]/30 text-[var(--good)] text-xs flex items-center justify-between">
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
                  <GameCoverImage
                    game={{ name: item.name, bggId: item.bggId, thumbnail: item.thumbnail }}
                    className="w-9 h-11 rounded border border-[var(--line)] shrink-0"
                    fallbackIconSize="text-xs"
                  />
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
