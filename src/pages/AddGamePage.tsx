import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Sparkles,
  PenLine,
  CheckCircle2,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../components/ui/cn';
import { useBGGSearch } from '../hooks/useBGGSearch';
import { useGameStore } from '../store/useGameStore';
import { createGameCoverDataUri, STATUS_CONFIG } from '../lib/utils';
import { BGGGameDetail, GameStatus } from '../types';

export const AddGamePage: React.FC = () => {
  const navigate = useNavigate();
  const addGame = useGameStore((s) => s.addGame);

  const [activeTab, setActiveTab] = useState<'bgg' | 'manual'>('bgg');
  const { query, setQuery, results, isLoading, isFetchingDetail, fetchDetail } =
    useBGGSearch('');

  // Form state (shared by pre-filled BGG selection or manual entry)
  const [selectedBggId, setSelectedBggId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [yearPublished, setYearPublished] = useState('2024');
  const [minPlayers, setMinPlayers] = useState('2');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [playingTime, setPlayingTime] = useState('60');
  const [bggRating, setBggRating] = useState('7.8');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [status, setStatus] = useState<GameStatus>('own');
  const [purchasePrice, setPurchasePrice] = useState('1200000');
  const [sellPrice, setSellPrice] = useState('');
  const [lentToName, setLentToName] = useState('');
  const [lentDate, setLentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSelectBGGCard = async (bggId: string) => {
    const detail: BGGGameDetail | null = await fetchDetail(bggId);
    if (!detail) return;
    setSelectedBggId(detail.bggId);
    setName(detail.name);
    setYearPublished(String(detail.yearPublished || 2023));
    setMinPlayers(String(detail.minPlayers || 2));
    setMaxPlayers(String(detail.maxPlayers || 4));
    setPlayingTime(String(detail.playingTime || 60));
    setBggRating(String(detail.bggRating || 7.5));
    setDescription(detail.description || '');
    setThumbnail(detail.image || detail.thumbnail || '');
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a boardgame title.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const generatedCover =
      thumbnail.trim() ||
      createGameCoverDataUri(
        name.trim(),
        `Strategy · ${yearPublished || 2024}`,
        ['#7c3aed', '#2563eb', '#22d3ee'],
        'hex'
      );

    setTimeout(() => {
      const created = addGame({
        bggId: selectedBggId,
        name: name.trim(),
        thumbnail: generatedCover,
        image: generatedCover,
        description:
          description.trim() ||
          `${name.trim()} is a tabletop boardgame in your BoardGame Vault collection.`,
        minPlayers: Math.max(1, Number(minPlayers) || 1),
        maxPlayers: Math.max(1, Number(maxPlayers) || 4),
        playingTime: Math.max(5, Number(playingTime) || 60),
        yearPublished: Number(yearPublished) || 2024,
        bggRating: bggRating ? Number(bggRating) : undefined,
        status,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        sellPrice:
          status === 'sold' && sellPrice ? Number(sellPrice) : undefined,
        lentToName:
          status === 'lent_out' && lentToName.trim()
            ? lentToName.trim()
            : undefined,
        lentDate:
          status === 'lent_out' && lentDate
            ? new Date(lentDate).toISOString()
            : undefined,
        notes: notes.trim() || undefined,
      });
      setIsSaving(false);
      navigate(`/collection/${created.id}`);
    }, 280);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>
        </div>

        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Add Game to Vault
          </h1>
          <p className="text-sm text-[#94a3b8]">
            Import box details from BoardGameGeek or enter a custom title manually
          </p>
        </div>

        {/* Two-Tab Selector */}
        <div
          role="tablist"
          aria-label="Add game mode"
          className="inline-flex p-1.5 rounded-2xl bg-[#16162a] border border-white/10"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'bgg'}
            type="button"
            onClick={() => setActiveTab('bgg')}
            className={cn(
              'min-h-[42px] px-5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer',
              activeTab === 'bgg'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Search BGG
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'manual'}
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setSelectedBggId(undefined);
            }}
            className={cn(
              'min-h-[42px] px-5 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer',
              activeTab === 'manual'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <PenLine className="w-4 h-4" />
            Add Manually
          </button>
        </div>

        {/* Tab 1: BGG Search Picker */}
        {activeTab === 'bgg' && (
          <Card className="p-6 space-y-4">
            <Input
              label="Search BoardGameGeek Catalog"
              placeholder="Type a game name (e.g., Azul, Terraforming Mars, Brass, Wingspan)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            {isLoading || isFetchingDetail ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {results.map((item) => {
                  const isPicked = selectedBggId === item.bggId;
                  return (
                    <button
                      key={item.bggId}
                      type="button"
                      onClick={() => void handleSelectBGGCard(item.bggId)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer',
                        isPicked
                          ? 'bg-[#7c3aed]/25 border-[#a78bfa] shadow-lg shadow-[#7c3aed]/20'
                          : 'bg-[#16162a] border-white/[0.08] hover:border-[#7c3aed]/50'
                      )}
                    >
                      <img
                        src={item.thumbnail || item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 rounded-lg object-cover shrink-0 bg-[#1e1e35]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-sm text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#94a3b8] tabular-nums">
                          {item.yearPublished || '2023'}
                        </p>
                        {isPicked && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Pre-filled below
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Game Details & Collection Form */}
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  {selectedBggId ? 'Verify Imported BGG Data' : 'Boardgame Details'}
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Customize collection status, VND valuation, and notes before saving
                </p>
              </div>
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt={name || 'Preview'}
                  referrerPolicy="no-referrer"
                  className="w-14 h-18 rounded-xl object-cover border border-white/15"
                />
              )}
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-semibold text-rose-300">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Game Name *"
                placeholder="e.g., Cascadia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Year Published"
                type="number"
                value={yearPublished}
                onChange={(e) => setYearPublished(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                label="Min Players"
                type="number"
                min={1}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
              />
              <Input
                label="Max Players"
                type="number"
                min={1}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
              <Input
                label="Play Time (min)"
                type="number"
                min={5}
                value={playingTime}
                onChange={(e) => setPlayingTime(e.target.value)}
              />
              <Input
                label="BGG Rating (1-10)"
                type="number"
                step="0.1"
                min={1}
                max={10}
                value={bggRating}
                onChange={(e) => setBggRating(e.target.value)}
              />
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#94a3b8] tracking-wide">
                Collection Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {(Object.keys(STATUS_CONFIG) as GameStatus[]).map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const active = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      style={{
                        borderColor: active ? cfg.color : 'rgba(255,255,255,0.1)',
                        backgroundColor: active ? cfg.bg : '#16162a',
                        color: active ? cfg.color : '#94a3b8',
                      }}
                      className="min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer"
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial & Conditional Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Purchase Price (VND)"
                type="number"
                placeholder="1500000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                helperText="Formatted in Vietnamese Dong (₫)"
              />

              {status === 'sold' && (
                <Input
                  label="Sell Price (VND)"
                  type="number"
                  placeholder="1100000"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                />
              )}
            </div>

            {status === 'lent_out' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                <Input
                  label="Lent To (Borrower Name)"
                  placeholder="e.g., Minh Quân"
                  value={lentToName}
                  onChange={(e) => setLentToName(e.target.value)}
                />
                <Input
                  label="Date Lent"
                  type="date"
                  value={lentDate}
                  onChange={(e) => setLentDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="game-description"
                className="block text-xs font-semibold text-[#94a3b8]"
              >
                Description
              </label>
              <textarea
                id="game-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Overview of gameplay mechanics and theme..."
                className="w-full rounded-xl bg-[#16162a] border border-white/10 p-3.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="game-notes"
                className="block text-xs font-semibold text-[#94a3b8]"
              >
                Personal Vault Notes
              </label>
              <textarea
                id="game-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Edition notes, card sleeve count, promos..."
                className="w-full rounded-xl bg-[#16162a] border border-white/10 p-3.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link to="/collection">
                <Button variant="ghost">Cancel</Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSaving}
              >
                Save to Vault
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AddGamePage;
