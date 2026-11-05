import React, { useState } from 'react';
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
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
import { Download, HardDriveDownload } from 'lucide-react';
import { GameStatus } from '../../types';
import { PoweredByBGG } from '../ui/PoweredByBGG';

export interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'file' | 'export' | 'bgg';
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

  const [activeTab, setActiveTab] = useState<'file' | 'export' | 'bgg'>(
    initialTab || 'file'
  );

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [bggUsername, setBggUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      `Đã nạp thành công ${importOptions.games ? `${summary.gameCount} boardgame, ` : ''}${importOptions.players ? `${summary.playerCount} người chơi, ` : ''}${importOptions.sessions ? `${summary.playCount} ván chơi, ` : ''}${importOptions.locations && summary.locationCount ? `${summary.locationCount} địa điểm` : ''} vào Vault!`
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

    setSuccessMessage(`Đã thêm thành công ${selected.length} boardgame vào bộ sưu tập!`);
    setPreviewItems([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Dữ Liệu Bộ Sưu Tập"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 text-sm">
        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-[#16162a] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'file'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập File (.ZIP / .JSON)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'export'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Sao Lưu &amp; Xuất Dữ Liệu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bgg')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bgg'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            BGG Sync
          </button>
        </div>

        {/* Tab 1: File Upload Box */}
        {activeTab === 'file' && !fullBackup && previewItems.length === 0 && (
          <div className="p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#7c3aed]/50 bg-[#1e1e35]/40 text-center space-y-3 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/20 text-[#a78bfa] mx-auto flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-white text-base">
                Kéo thả file Export từ BG Catalog vào đây
              </p>
              <p className="text-xs text-[#94a3b8] mt-1 max-w-md mx-auto">
                Hỗ trợ trực tiếp file sao lưu <strong className="text-white">.ZIP</strong> hoặc{' '}
                <strong className="text-white">.JSON</strong> xuất từ BG Catalog (iOS). Tự động nạp
                toàn bộ Game, Bạn bè &amp; 1.000+ Ván chơi lịch sử!
              </p>
            </div>
            <label className="inline-block cursor-pointer">
              <span className="px-5 py-2.5 rounded-xl bg-[image:var(--gradient-hero)] text-white text-xs font-bold shadow hover:opacity-95 transition-opacity inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" /> Chọn File (.zip / .json / .csv)
              </span>
              <input
                type="file"
                accept=".zip,.json,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
            {loading && (
              <p className="text-xs text-[#a78bfa] animate-pulse">
                Đang đọc và phân tích dữ liệu...
              </p>
            )}
          </div>
        )}

        {/* FULL BG CATALOG BACKUP PREVIEW CARD */}
        {fullBackup && (
          <div className="p-5 rounded-2xl bg-[#16162a] border border-[#7c3aed]/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center text-xl shadow-lg shadow-[#7c3aed]/30">
                  🎉
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Đã nhận diện bản sao lưu BG Catalog hoàn chỉnh!
                  </h4>
                  <p className="text-xs text-[#94a3b8]">
                    Bản xuất này chứa đầy đủ kho game, người chơi và lịch sử các ván đấu.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#1e1e35] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#22d3ee]">
                  <Gamepad2 className="w-4 h-4" />
                  <span className="font-bold">Board Games</span>
                </div>
                <p className="text-2xl font-black text-white tabular-nums">
                  {fullBackup.summary.gameCount}
                </p>
                <p className="text-[10px] text-[#94a3b8]">
                  {fullBackup.summary.ownCount} sở hữu{Boolean(fullBackup.summary.rentedCount) ? ' · ' + fullBackup.summary.rentedCount + ' thuê' : ''} · {fullBackup.summary.soldCount} đã bán
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#1e1e35] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
                  <Users className="w-4 h-4" />
                  <span className="font-bold">Người chơi</span>
                </div>
                <p className="text-2xl font-black text-white tabular-nums">
                  {fullBackup.summary.playerCount}
                </p>
                <p className="text-[10px] text-[#94a3b8] truncate">
                  {fullBackup.players.map((p) => p.name).slice(0, 3).join(', ')}...
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#1e1e35] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#ec4899]">
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold">Ván đấu đã chơi</span>
                </div>
                <p className="text-2xl font-black text-white tabular-nums">
                  {fullBackup.summary.playCount}
                </p>
                <p className="text-[10px] text-[#94a3b8]">Kèm điểm &amp; người thắng</p>
              </div>
            </div>

            {/* Options */}
            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <p className="font-bold text-white">Tùy chọn nạp:</p>
              <div className="flex flex-wrap gap-4 text-[#94a3b8]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.games}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, games: e.target.checked }))
                    }
                    className="rounded text-[#7c3aed]"
                  />
                  <span>Nạp {fullBackup.summary.gameCount} Games</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.players}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, players: e.target.checked }))
                    }
                    className="rounded text-[#7c3aed]"
                  />
                  <span>Nạp {fullBackup.summary.playerCount} Người chơi</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOptions.sessions}
                    onChange={(e) =>
                      setImportOptions((o) => ({ ...o, sessions: e.target.checked }))
                    }
                    className="rounded text-[#7c3aed]"
                  />
                  <span>Nạp {fullBackup.summary.playCount} Ván chơi</span>
                </label>
                {fullBackup.locations && fullBackup.locations.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.locations}
                      onChange={(e) =>
                        setImportOptions((o) => ({ ...o, locations: e.target.checked }))
                      }
                      className="rounded text-[#7c3aed]"
                    />
                    <span>Nạp {fullBackup.locations.length} Địa điểm</span>
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setFullBackup(null)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" onClick={handleExecuteFullRestore}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Khôi Phục Toàn Bộ Dữ Liệu
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Export & Backup */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Full Backup Box */}
            <div className="p-5 rounded-2xl bg-[#1e1e35]/60 border border-[var(--border-glow)] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[image:var(--gradient-hero)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent-glow)] shrink-0">
                    <HardDriveDownload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                      Sao Lưu Toàn Bộ Dữ Liệu (.JSON)
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Xuất 1 file đầy đủ Kho Game, Người Chơi, Địa Điểm &amp; Lịch Sử Ván Đấu. Dùng để backup an toàn hoặc chuyển sang máy khác.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-secondary)] block font-medium">Kho Game</span>
                  <span className="font-display font-black text-lg text-[var(--text-primary)]">{games.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-secondary)] block font-medium">Người Chơi</span>
                  <span className="font-display font-black text-lg text-[var(--accent-neon)]">{players.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-secondary)] block font-medium">Ván Chơi</span>
                  <span className="font-display font-black text-lg text-amber-400">{sessions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-secondary)] block font-medium">Địa Điểm</span>
                  <span className="font-display font-black text-lg text-emerald-400">{locations.length}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center py-3 text-sm font-bold shadow-lg shadow-[var(--accent-glow)]"
                onClick={() => {
                  exportVaultJSON();
                  setSuccessMessage('Đã tải xuống file sao lưu BoardGameVault JSON thành công!');
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải Bản Sao Lưu Toàn Bộ (.JSON)
              </Button>
            </div>

            {/* Export CSV for Excel / Sheets */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  Xuất Bảng Tính CSV (Xem trên Excel / Google Sheets)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    exportGamesCSV();
                    setSuccessMessage('Đã xuất danh sách Game ra file CSV thành công!');
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/[0.08] border border-[var(--border-subtle)] text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Xuất Danh Sách Game</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">{games.length} tựa game</span>
                  </div>
                  <Download className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-neon)] transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportSessionsCSV();
                    setSuccessMessage('Đã xuất lịch sử Ván Chơi ra file CSV thành công!');
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-white/[0.08] border border-[var(--border-subtle)] text-left flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Xuất Lịch Sử Ván Chơi</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">{sessions.length} ván đấu</span>
                  </div>
                  <Download className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-neon)] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: BGG Username */}
        {activeTab === 'bgg' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#94a3b8]">
                Nhập BoardGameGeek username công khai để kéo toàn bộ game đánh dấu "Owned".
              </p>
              <PoweredByBGG variant="inline" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="ví dụ: your_bgg_username"
                  value={bggUsername}
                  onChange={(e) => setBggUsername(e.target.value)}
                  leftIcon={<Database className="w-4 h-4 text-[#22d3ee]" />}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleFetchBGG}
                disabled={loading || !bggUsername.trim()}
              >
                {loading ? 'Đang tải...' : 'Kéo Games'}
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        )}

        {/* Simple Game Preview List */}
        {previewItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>
                Tìm thấy <strong className="text-white">{previewItems.length}</strong> games (
                {previewItems.filter((i) => i.selected).length} đã chọn)
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[#a78bfa] hover:underline cursor-pointer"
              >
                {previewItems.every((i) => i.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-white/10 p-2 bg-[#121222]">
              {previewItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleItem(idx)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    item.selected
                      ? 'bg-[#7c3aed]/15 border border-[#7c3aed]/30'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => {}}
                    className="rounded border-white/20 text-[#7c3aed] focus:ring-[#7c3aed]"
                  />
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="w-9 h-11 object-cover rounded bg-[#1e1e35]"
                    />
                  ) : (
                    <div className="w-9 h-11 rounded bg-[#1e1e35] flex items-center justify-center text-xs text-[#94a3b8]">
                      🎲
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-xs truncate">{item.name}</p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {item.yearPublished || 'N/A'} · {item.minPlayers}-{item.maxPlayers} người · Trạng thái: {item.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setPreviewItems([])}>
                Xóa
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteSimpleImport}
                disabled={!previewItems.some((i) => i.selected)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Nạp {previewItems.filter((i) => i.selected).length} Games
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CollectionImportModal;
