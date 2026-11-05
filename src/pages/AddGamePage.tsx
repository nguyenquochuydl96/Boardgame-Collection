import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Sparkles,
  PenLine,
  CheckCircle2,
  Settings,
  Loader2,
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
import { BGGConfigModal } from '../components/game/BGGConfigModal';
import { BGGCardThumbnail } from '../components/game/BGGCardThumbnail';
import { PoweredByBGG } from '../components/ui/PoweredByBGG';

export const AddGamePage: React.FC = () => {
  const navigate = useNavigate();
  const addGame = useGameStore((s) => s.addGame);

  const [activeTab, setActiveTab] = useState<'bgg' | 'manual'>('bgg');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
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
    setYearPublished(String(detail.yearPublished || 2024));
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Add Game to Vault
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Import box details from BoardGameGeek or enter a custom title manually
            </p>
          </div>
          <PoweredByBGG variant="badge" />
        </div>

        {/* Two-Tab Selector */}
        <div
          role="tablist"
          aria-label="Add game mode"
          className="inline-flex p-1.5 rounded-2xl bg-[var(--bg-card)] border border-white/10"
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
                : 'text-[var(--text-secondary)] hover:text-white'
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
                : 'text-[var(--text-secondary)] hover:text-white'
            )}
          >
            <PenLine className="w-4 h-4" />
            Add Manually
          </button>
        </div>

        {/* Tab 1: BGG Search Picker */}
        {activeTab === 'bgg' && (
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-secondary)]">Live BGG Catalog Lookup</span>
                <PoweredByBGG variant="inline" />
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-[#a78bfa] hover:text-white transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Proxy &amp; Token Settings
              </button>
            </div>

            <Input
              placeholder="Type a game name (e.g., Wingspan, Catan, Brass, Dune, Azul, Scout)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={
                isLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline text-[11px] font-mono">BGG...</span>
                  </div>
                ) : query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                    title="Clear search"
                  >
                    ✕
                  </button>
                ) : null
              }
            />

            {isLoading && results.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--text-secondary)] bg-[var(--bg-card)]/40 rounded-2xl border border-white/5">
                No matching boardgames found for &quot;{query}&quot;. You can switch to the &quot;Add Manually&quot; tab to enter your custom details.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {results.map((item) => {
                  const isPicked = selectedBggId === item.bggId;
                  const isFetchingThis = isFetchingDetail && isPicked;
                  return (
                    <button
                      key={item.bggId}
                      type="button"
                      disabled={isFetchingDetail}
                      onClick={() => void handleSelectBGGCard(item.bggId)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer group',
                        isPicked
                          ? 'bg-[#7c3aed]/25 border-[#7c3aed] ring-2 ring-[#7c3aed]/40'
                          : 'bg-[var(--paper)]/60 border-white/10 hover:border-[#7c3aed]/40 hover:bg-[var(--paper)]',
                        isFetchingDetail && !isPicked && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <BGGCardThumbnail
                        src={item.thumbnail || item.image}
                        name={item.name}
                        className="w-12 h-14"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-display font-bold text-sm text-white truncate group-hover:text-[#a78bfa]">
                            {item.name}
                          </p>
                          {isPicked && !isFetchingThis && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isFetchingThis && (
                            <Loader2 className="w-3.5 h-3.5 text-[#22d3ee] animate-spin shrink-0" />
                          )}
                        </div>
                        {item.yearPublished && (
                          <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">
                            {item.yearPublished}
                          </p>
                        )}
                        <span className="text-[11px] text-[#22d3ee] font-semibold block mt-1">
                          {isFetchingThis ? 'Importing...' : isPicked ? '✓ Selected' : 'Select Game'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Form Card (pre-filled or manual) */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-4">
                <Input
                  label="Boardgame Title *"
                  placeholder="e.g. Wingspan, Catan, Scythe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input
                    label="Year Published"
                    type="number"
                    value={yearPublished}
                    onChange={(e) => setYearPublished(e.target.value)}
                  />
                  <Input
                    label="Min Players"
                    type="number"
                    min="1"
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(e.target.value)}
                  />
                  <Input
                    label="Max Players"
                    type="number"
                    min="1"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                  />
                  <Input
                    label="Play Time (min)"
                    type="number"
                    value={playingTime}
                    onChange={(e) => setPlayingTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Cover Art Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Cover Image Preview
                </label>
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-white/10 flex items-center justify-center p-2 relative">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={name || 'Cover preview'}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-[#475569]">
                      <Sparkles className="w-6 h-6 mx-auto mb-1 text-[#7c3aed]/50" />
                      Cover art will auto-generate on save
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ownership Status & Finance */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Ownership Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {(
                    [
                      'own',
                      'rented',
                      'lent_out',
                      'borrowed',
                      'sold',
                      'wishlist',
                      'previously_owned',
                    ] as GameStatus[]
                  ).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isSelected = status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={cn(
                          'p-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer',
                          isSelected
                            ? 'bg-white/15 border-white/40 text-white shadow-lg'
                            : 'bg-[var(--bg-card)] border-white/5 text-[var(--text-secondary)] hover:text-white'
                        )}
                      >
                        <span className={cn('block font-extrabold', cfg.color)}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {status === 'rented' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                    <span className="text-base">☕</span>
                    <div>
                      <p className="font-bold text-amber-300">Rented / Cafe Play</p>
                      <p className="text-amber-200/80 mt-0.5">
                        Played at board game cafes or rented — excluded from personal collection valuation.
                      </p>
                    </div>
                  </div>
                )}

              {/* Price Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Purchase Price (VND)"
                  type="number"
                  placeholder="e.g. 1450000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  helperText="Tracked in collection total portfolio value"
                />

                {status === 'sold' && (
                  <Input
                    label="Sell Price (VND)"
                    type="number"
                    placeholder="e.g. 950000"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    helperText="Displayed for sold or traded boardgames"
                  />
                )}
              </div>

              {/* Lent-out Fields */}
              {status === 'lent_out' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/30">
                  <Input
                    label="Lent to (Borrower Name)"
                    placeholder="e.g. Alex, Sam"
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
            </div>

            {/* Description & Notes */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="space-y-1.5">
                <label
                  htmlFor="game-desc"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Description
                </label>
                <textarea
                  id="game-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of gameplay, theme, or expansion notes..."
                  className="w-full rounded-xl bg-[var(--bg-card)] border border-white/10 p-3.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="game-notes"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                >
                  Personal Notes
                </label>
                <textarea
                  id="game-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Edition notes, card sleeve count, promos..."
                  className="w-full rounded-xl bg-[var(--bg-card)] border border-white/10 p-3.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none focus:border-[#7c3aed]"
                />
              </div>
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

        {/* Modal */}
        <BGGConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </PageTransition>
  );
};

export default AddGamePage;
