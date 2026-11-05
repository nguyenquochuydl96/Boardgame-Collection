import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Smile,
  X,
  Check,
  Sparkles,
  Gamepad2,
  Trophy,
  Skull,
  Heart,
  Palette,
  User,
  Quote,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Player } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useGameStore } from '../../store/useGameStore';
import {
  BOARDGAME_THEMED_AVATARS,
  PLAY_STYLES,
  getDeterministicAvatar,
} from '../../lib/boardgameAvatars';
import {
  resolveAvatarImage,
  getSafeDisplayAvatar,
  compressImageToDataUrl,
} from '../../lib/utils';
import { cn } from '../ui/cn';

export const PLAYER_COLORS = [
  '#f59e0b', // Amber / Gold
  '#7c3aed', // Purple
  '#22d3ee', // Cyan
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f97316', // Orange
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
];

export interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: Player | null; // if provided, editing mode; else adding mode
  onSuccess?: (player: Player) => void;
}

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
}) => {
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const updatePlayer = usePlayerStore((s) => s.updatePlayer);
  const games = useGameStore((s) => s.games);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarTab, setAvatarTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [urlInput, setUrlInput] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [playStyle, setPlayStyle] = useState('');
  const [specialtyGameId, setSpecialtyGameId] = useState('');
  const [weaknessGameId, setWeaknessGameId] = useState('');
  const [favoriteGameId, setFavoriteGameId] = useState('');
  const [bio, setBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Sync state when editing or opening
  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setNickname(player.nickname || '');
      setAvatar(player.avatar || '');
      setColor(player.color || PLAYER_COLORS[0]);
      setPlayStyle(player.playStyle || '');
      setSpecialtyGameId(player.specialtyGameId || '');
      setWeaknessGameId(player.weaknessGameId || '');
      setFavoriteGameId(player.favoriteGameId || '');
      setBio(player.bio || '');

      const isImg = resolveAvatarImage(player.avatar);
      if (isImg) {
        if (player.avatar?.startsWith('http')) {
          setAvatarTab('url');
          setUrlInput(player.avatar);
        } else {
          setAvatarTab('upload');
        }
      } else {
        setAvatarTab('preset');
      }
    } else {
      // Adding new player default
      const defaultBg = getDeterministicAvatar(String(Date.now()));
      setName('');
      setNickname('');
      setAvatar(defaultBg.emoji);
      setColor(defaultBg.color || PLAYER_COLORS[0]);
      setPlayStyle('');
      setSpecialtyGameId('');
      setWeaknessGameId('');
      setFavoriteGameId('');
      setBio('');
      setAvatarTab('preset');
      setUrlInput('');
    }
  }, [player, isOpen]);

  // Handle image upload from computer/phone
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImageToDataUrl(file, 200, 0.85);
      setAvatar(compressedDataUrl);
    } catch (err) {
      console.error('Failed to compress avatar image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setAvatar(urlInput.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const specialtyGame = games.find((g) => g.id === specialtyGameId);
    const weaknessGame = games.find((g) => g.id === weaknessGameId);
    const favoriteGame = games.find((g) => g.id === favoriteGameId);

    const payload = {
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      avatar: avatar || getDeterministicAvatar(name).emoji,
      color,
      playStyle: playStyle || undefined,
      specialtyGameId: specialtyGameId || undefined,
      specialtyGameName: specialtyGame?.name || undefined,
      weaknessGameId: weaknessGameId || undefined,
      weaknessGameName: weaknessGame?.name || undefined,
      favoriteGameId: favoriteGameId || undefined,
      favoriteGameName: favoriteGame?.name || undefined,
      bio: bio.trim() || undefined,
    };

    if (player) {
      updatePlayer(player.id, payload);
      onSuccess?.({ ...player, ...payload });
    } else {
      const created = addPlayer(payload);
      onSuccess?.(created);
    }

    onClose();
  };

  const isEditing = Boolean(player);
  const imagePreview = resolveAvatarImage(avatar);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Player Profile' : 'Add New Player'}
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* TOP PREVIEW & BASIC INFO */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <div
              style={{
                borderColor: color,
                backgroundColor: `${color}25`,
              }}
              className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl shadow-xl overflow-hidden relative select-none"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getSafeDisplayAvatar(avatar, '🎲')}</span>
              )}
            </div>

            <div
              style={{ backgroundColor: color }}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[var(--bg-surface)] shadow-md flex items-center justify-center text-[10px] text-slate-950 font-bold"
            >
              ✓
            </div>
          </div>

          {/* Name & Nickname Inputs */}
          <div className="flex-1 w-full space-y-3">
            <Input
              label="Player Name *"
              placeholder="e.g. Huy Nguyen, Alex..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="text-sm font-bold"
            />

            <Input
              label="Nickname / Tabletop Title"
              placeholder="e.g. The Dice King, Euro Mastermind, Chaos Agent..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* AVATAR SELECTOR (3 TABS) */}
        <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-amber-400" />
              <span>Avatar</span>
            </label>

            {/* Avatar Tab Selector */}
            <div className="flex p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAvatarTab('preset')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                  avatarTab === 'preset'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                Boardgame Emoji
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('upload')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                  avatarTab === 'upload'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('url')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                  avatarTab === 'url'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                Online Image URL
              </button>
            </div>
          </div>

          {/* TAB 1: PRESET BOARDGAME EMOJIS */}
          {avatarTab === 'preset' && (
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
              {BOARDGAME_THEMED_AVATARS.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  title={item.name}
                  onClick={() => {
                    setAvatar(item.emoji);
                    if (!player) setColor(item.color);
                  }}
                  className={cn(
                    'h-11 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer',
                    avatar === item.emoji
                      ? 'bg-amber-500/25 border-amber-400 scale-105 shadow-md shadow-amber-500/10'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-white/30 hover:scale-105'
                  )}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {avatarTab === 'upload' && (
            <div className="space-y-3 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-[var(--border-subtle)] hover:border-amber-400/60 bg-[var(--bg-elevated)]/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white">
                  {isUploading ? 'Processing image...' : 'Click or tap to upload photo'}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Supports PNG, JPG, WebP. Automatically optimized.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE URL */}
          {avatarTab === 'url' && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Paste image URL (https://...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                leftIcon={<LinkIcon className="w-4 h-4 text-[var(--text-secondary)]" />}
                className="text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        {/* SIGNATURE COLOR */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Signature Color</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            {PLAYER_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Color ${hex}`}
                onClick={() => setColor(hex)}
                style={{ backgroundColor: hex }}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-transform cursor-pointer relative',
                  color === hex
                    ? 'border-white scale-110 shadow-lg shadow-black/40 ring-2 ring-white/30'
                    : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                )}
              >
                {color === hex && (
                  <Check className="w-4 h-4 text-white mx-auto drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* PLAY STYLE (GAMER PERSONA) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Gamer Persona &amp; Playstyle</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {PLAY_STYLES.map((style) => {
              const isSelected = playStyle === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => setPlayStyle(isSelected ? '' : style.id)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all cursor-pointer text-left flex items-start gap-2.5 select-none',
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-md text-white'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                  )}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{style.emoji}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{style.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                      {style.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GAME IDENTITIES: FAVORITE, SIGNATURE, NEMESIS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)]">
          {/* Favorite Game */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Favorite Game</span>
            </label>
            <select
              value={favoriteGameId}
              onChange={(e) => setFavoriteGameId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">⭐ Auto (Most Played)</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-muted)]">
              Pin your personal favorite or auto-detect
            </p>
          </div>

          {/* Specialty Game */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Signature Game</span>
            </label>
            <select
              value={specialtyGameId}
              onChange={(e) => setSpecialtyGameId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="">🏆 Auto (Highest Win Rate ≥ 5 plays)</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-muted)]">
              Auto-calculated from 5+ plays or pinned manually
            </p>
          </div>

          {/* Weakness Game */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <Skull className="w-3.5 h-3.5" />
              <span>Nemesis Game</span>
            </label>
            <select
              value={weaknessGameId}
              onChange={(e) => setWeaknessGameId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
            >
              <option value="">💀 Auto (Lowest Win Rate ≥ 5 plays)</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text-muted)]">
              Auto-calculated from 5+ plays or pinned manually
            </p>
          </div>
        </div>

        {/* BIO / QUOTE */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Bio / Tabletop Quote</span>
          </label>
          <textarea
            placeholder="e.g. Win with grace, blame the dice on defeat! Or: Here for the spicy trades..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {isEditing ? 'Save Changes' : 'Create Player'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PlayerFormModal;
