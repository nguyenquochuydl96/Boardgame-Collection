import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Sparkles, User, Database } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { parseImportFile, ImportPreviewItem } from '../../lib/importer';
import { importBGGCollection } from '../../lib/bgg';
import { useGameStore } from '../../store/useGameStore';
import { createGameCoverDataUri } from '../../lib/utils';
import { GameStatus } from '../../types';

export interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CollectionImportModal: React.FC<CollectionImportModalProps> = ({ isOpen, onClose }) => {
  const addGame = useGameStore((s) => s.addGame);

  const [activeTab, setActiveTab] = useState<'file' | 'bgg'>('file');
  const [bggUsername, setBggUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessCount(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parsed = parseImportFile(content);
      if (parsed.length === 0) {
        setError('Could not find any boardgames in this file. Please ensure it is a valid CSV or JSON export from BG Catalog or BGG.');
      } else {
        setPreviewItems(parsed);
      }
    };

    reader.onerror = () => {
      setError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  };

  // Handle BGG Username Sync
  const handleFetchBGG = async () => {
    if (!bggUsername.trim()) {
      setError('Please enter a BoardGameGeek username.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessCount(null);

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

  // Toggle selection
  const toggleItem = (index: number) => {
    setPreviewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleAll = () => {
    const allSelected = previewItems.every((i) => i.selected);
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  // Execute Import
  const handleExecuteImport = () => {
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
        description: `${item.name} imported from external collection.`,
      });
    }

    setSuccessCount(selected.length);
    setPreviewItems([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Collection" maxWidthClass="max-w-2xl">
      <div className="space-y-5 text-sm">
        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-[#16162a] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'file'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            From File (BG Catalog / CSV / JSON)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bgg')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bgg'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            From BGG Username
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'file' && (
          <div className="p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#7c3aed]/50 bg-[#1e1e35]/40 text-center space-y-3 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/20 text-[#a78bfa] mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-white">Upload BG Catalog CSV or JSON Export</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Compatible with BG Catalog iOS exports, BGG collection CSVs, or generic game lists.
              </p>
            </div>
            <label className="inline-block cursor-pointer">
              <span className="px-4 py-2 rounded-xl bg-[image:var(--gradient-hero)] text-white text-xs font-bold shadow hover:opacity-95 transition-opacity inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Choose File
              </span>
              <input type="file" accept=".csv,.json,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Tab 2: BGG Username */}
        {activeTab === 'bgg' && (
          <div className="space-y-3">
            <p className="text-xs text-[#94a3b8]">
              Enter your public BoardGameGeek username to retrieve all games marked as "Owned".
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g. your_bgg_username"
                  value={bggUsername}
                  onChange={(e) => setBggUsername(e.target.value)}
                  leftIcon={<Database className="w-4 h-4 text-[#22d3ee]" />}
                />
              </div>
              <Button variant="primary" onClick={handleFetchBGG} disabled={loading || !bggUsername.trim()}>
                {loading ? 'Fetching...' : 'Sync Games'}
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
        {successCount !== null && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Successfully imported {successCount} boardgames into your vault!</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {/* Preview List */}
        {previewItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#94a3b8]">
              <span>
                Found <strong className="text-white">{previewItems.length}</strong> games ({previewItems.filter((i) => i.selected).length} selected)
              </span>
              <button type="button" onClick={toggleAll} className="text-[#a78bfa] hover:underline cursor-pointer">
                {previewItems.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-white/10 p-2 bg-[#121222]">
              {previewItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleItem(idx)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    item.selected ? 'bg-[#7c3aed]/15 border border-[#7c3aed]/30' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => {}}
                    className="rounded border-white/20 text-[#7c3aed] focus:ring-[#7c3aed]"
                  />
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="w-9 h-11 object-cover rounded bg-[#1e1e35]" />
                  ) : (
                    <div className="w-9 h-11 rounded bg-[#1e1e35] flex items-center justify-center text-xs text-[#94a3b8]">
                      🎲
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-xs truncate">{item.name}</p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {item.yearPublished || 'Year N/A'} · {item.minPlayers}-{item.maxPlayers} players · Status: {item.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setPreviewItems([])}>
                Clear
              </Button>
              <Button variant="primary" size="sm" onClick={handleExecuteImport} disabled={!previewItems.some((i) => i.selected)}>
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
