import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Trash2,
  ExternalLink,
  Users,
  Clock,
  Star,
  FileText,
  Tag,
  AlertTriangle,
  UserCheck,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BoardGame, GameStatus } from '../../types';
import { STATUS_CONFIG, formatNumberInput, parseNumberInput, getGameCoverImage } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../ui/cn';

export interface QuickEditGameModalProps {
  game: BoardGame | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: BoardGame) => void;
  onDelete?: (gameId: string) => void;
}

export const QuickEditGameModal: React.FC<QuickEditGameModalProps> = ({
  game,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<GameStatus>('own');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [lentToName, setLentToName] = useState<string>('');
  const [lentDate, setLentDate] = useState<string>('');
  const [minPlayers, setMinPlayers] = useState<number>(1);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [playingTime, setPlayingTime] = useState<number>(60);
  const [yearPublished, setYearPublished] = useState<number>(2024);
  const [bggRating, setBggRating] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (!game) return;
    setName(game.name || '');
    setStatus(game.status || 'own');
    setPurchasePrice(game.purchasePrice ? formatNumberInput(game.purchasePrice) : '');
    setSellPrice(game.sellPrice ? formatNumberInput(game.sellPrice) : '');
    setLentToName(game.lentToName || '');
    setLentDate(game.lentDate ? game.lentDate.slice(0, 10) : '');
    setMinPlayers(game.minPlayers || 1);
    setMaxPlayers(game.maxPlayers || 4);
    setPlayingTime(game.playingTime || 60);
    setYearPublished(game.yearPublished || 2024);
    setBggRating(game.bggRating ? String(game.bggRating) : '');
    setNotes(game.notes || '');
    setTagsInput((game.tags || []).join(', '));
    setIsConfirmingDelete(false);
    setIsSavedNotice(false);
  }, [game, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  if (!isOpen || !game || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated: BoardGame = {
      ...game,
      name: name.trim(),
      status,
      purchasePrice: parseNumberInput(purchasePrice),
      sellPrice: status === 'sold' && sellPrice ? parseNumberInput(sellPrice) : undefined,
      lentToName: status === 'lent_out' && lentToName.trim() ? lentToName.trim() : undefined,
      lentDate: status === 'lent_out' && lentDate ? new Date(lentDate).toISOString() : undefined,
      minPlayers: Math.max(1, Number(minPlayers) || 1),
      maxPlayers: Math.max(1, Number(maxPlayers) || 1),
      playingTime: Math.max(5, Number(playingTime) || 60),
      yearPublished: Number(yearPublished) || 2024,
      bggRating: bggRating ? Number(bggRating) : undefined,
      notes: notes.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    };

    onSave(updated);
    setIsSavedNotice(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete(game.id);
    onClose();
  };

  const statusKeys: GameStatus[] = [
    'own',
    'rented',
    'lent_out',
    'borrowed',
    'sold',
    'wishlist',
    'previously_owned',
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="quick-edit-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 cursor-pointer overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          key="quick-edit-modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="bg-[var(--card)] rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-[var(--line)] relative cursor-default text-[var(--ink)] my-auto max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--line)] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-14 rounded-xl overflow-hidden bg-[var(--card-2)] shrink-0 border border-[var(--line)]">
                {getGameCoverImage(game) ? (
                  <img
                    src={getGameCoverImage(game)}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--muted)]">
                    🎲
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-[var(--ink)] truncate">
                    Quick Edit Game
                  </h3>
                  {isSavedNotice && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Check className="w-3 h-3" /> Saved!
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] truncate">
                  Edit ownership, pricing, player counts, and notes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                to={`/collection/${game.id}`}
                className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--hover-bg)] transition-colors"
                title="View Full Game Page"
                onClick={onClose}
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
            {/* Title & Published Year */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Game Title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wingspan"
                  required
                />
              </div>
              <div>
                <Input
                  label="Year"
                  type="number"
                  value={yearPublished}
                  onChange={(e) => setYearPublished(Number(e.target.value))}
                  placeholder="2024"
                />
              </div>
            </div>

            {/* Ownership Status Segmented Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Ownership Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {statusKeys.map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const active = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      style={{
                        borderColor: active ? cfg.color : undefined,
                        backgroundColor: active ? cfg.bg : undefined,
                      }}
                      className={cn(
                        'p-2 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs select-none border-[var(--line)] bg-[var(--card-2)]',
                        active ? 'shadow-md scale-[1.02]' : 'hover:border-[var(--line-strong)]'
                      )}
                    >
                      <span style={{ color: cfg.color }} className="truncate block">
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Status Helper & Fields */}
            {status === 'rented' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-200">
                <p className="font-bold text-amber-600 dark:text-amber-300">☕ Rented / Cafe Boardgame</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Played or rented at tabletop cafes. Excluded from personal collection portfolio valuation.
                </p>
              </div>
            )}

            {status === 'lent_out' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                <Input
                  label="Lent To (Borrower Name)"
                  placeholder="e.g. Alex Smith"
                  value={lentToName}
                  onChange={(e) => setLentToName(e.target.value)}
                  leftIcon={<UserCheck className="w-3.5 h-3.5 text-orange-400" />}
                />
                <Input
                  label="Date Lent"
                  type="date"
                  value={lentDate}
                  onChange={(e) => setLentDate(e.target.value)}
                />
              </div>
            )}

            {/* Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Purchase Price (VND)"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1,450,000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(formatNumberInput(e.target.value))}
                helperText="Active shelf valuation"
              />

              {status === 'sold' && (
                <Input
                  label="Sell Price (VND)"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 950,000"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(formatNumberInput(e.target.value))}
                  helperText="Final sold price"
                />
              )}
            </div>

            {/* Player Count & Playtime */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <Input
                  label="Min Players"
                  type="number"
                  min={1}
                  max={99}
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(Number(e.target.value))}
                  leftIcon={<Users className="w-3.5 h-3.5 text-sky-400" />}
                />
              </div>
              <div>
                <Input
                  label="Max Players"
                  type="number"
                  min={1}
                  max={99}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  leftIcon={<Users className="w-3.5 h-3.5 text-purple-400" />}
                />
              </div>
              <div>
                <Input
                  label="Playtime (min)"
                  type="number"
                  min={5}
                  value={playingTime}
                  onChange={(e) => setPlayingTime(Number(e.target.value))}
                  leftIcon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
                />
              </div>
            </div>

            {/* Tags & Notes */}
            <Input
              label="Custom Tags (comma separated)"
              placeholder="e.g. Engine Building, Cozy, 2-Player"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              leftIcon={<Tag className="w-3.5 h-3.5 text-pink-400" />}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Notes &amp; Custom Rules</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Custom expansions, card sleeves, favorite variants..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] outline-none text-xs text-[var(--ink)] placeholder:text-[var(--muted)]/50 resize-none transition-all"
              />
            </div>

            {/* Footer Action Bar */}
            <div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {onDelete ? (
                isConfirmingDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-rose-500 font-bold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1.5 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="p-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer self-start sm:self-auto"
                    title="Delete Game from Vault"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              ) : (
                <div />
              )}

              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  className="bg-[var(--accent)] text-white font-bold shadow-md hover:opacity-90"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default QuickEditGameModal;
