import React, { useState } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Database,
  KeyRound,
  AlertTriangle,
  Radio,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../ui/cn';
import { useSyncStore } from '../../store/useSyncStore';
import {
  pushVaultToCloud,
  pullVaultFromCloud,
  testSupabaseConnection,
  generateMobileSyncLink,
  SQL_SETUP_SCRIPT,
} from '../../lib/supabaseSync';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    supabaseUrl,
    supabaseAnonKey,
    vaultId,
    isEnabled,
    autoSync,
    lastSyncedAt,
    syncStatus,
    errorMessage,
    setCredentials,
    setAutoSync,
    disconnect,
  } = useSyncStore();

  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);

  const [activeTab, setActiveTab] = useState<'status' | 'connect' | 'guide'>(
    isEnabled ? 'status' : 'connect'
  );

  // Form state
  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseAnonKey);
  const [vaultInput, setVaultInput] = useState(vaultId || 'huy-vault-2026');

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setUrlInput(supabaseUrl);
      setKeyInput(supabaseAnonKey);
      setVaultInput(vaultId || 'huy-vault-2026');
      setActiveTab(isEnabled ? 'status' : 'connect');
      setActionSuccess(null);
      setActionError(null);
    }
  }, [isOpen, isEnabled, supabaseUrl, supabaseAnonKey, vaultId]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim() || !vaultInput.trim()) {
      setActionError('Please fill in all three fields: Supabase URL, Anon Key, and Vault Sync Code.');
      return;
    }

    setIsTesting(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await testSupabaseConnection(urlInput.trim(), keyInput.trim());
    setIsTesting(false);

    if (!result.success) {
      setActionError(result.message);
      return;
    }

    setCredentials(urlInput.trim(), keyInput.trim(), vaultInput.trim());
    setActionSuccess('Successfully connected! Pushing initial dataset to cloud...');

    // Push initial vault
    setIsSyncing(true);
    const pushResult = await pushVaultToCloud();
    setIsSyncing(false);

    if (pushResult.success) {
      setActionSuccess('Connected and synced your vault to Supabase Cloud!');
      setActiveTab('status');
    } else {
      setActionError(pushResult.error || 'Failed to upload initial vault data.');
    }
  };

  const handleManualPush = async () => {
    setIsSyncing(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await pushVaultToCloud();
    setIsSyncing(false);

    if (res.success) {
      setActionSuccess(`Uploaded ${games.length} games and ${sessions.length} sessions to Cloud!`);
    } else {
      setActionError(res.error || 'Upload failed.');
    }
  };

  const handleManualPull = async () => {
    setIsSyncing(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await pullVaultFromCloud('replace');
    setIsSyncing(false);

    if (res.success) {
      setActionSuccess(
        `Downloaded ${res.count?.games ?? 0} games and ${res.count?.sessions ?? 0} sessions from Cloud!`
      );
    } else {
      setActionError(res.error || 'Download failed.');
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {}
  };

  const handleCopyMobileLink = async () => {
    const link = generateMobileSyncLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cloud Sync (Cross-Device)"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-5">
        {/* Tab navigation */}
        <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {isEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5',
                activeTab === 'status'
                  ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              )}
            >
              <CloudCheck className="w-4 h-4" />
              <span>Sync Dashboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'connect'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-white'
            )}
          >
            <KeyRound className="w-4 h-4" />
            <span>{isEnabled ? 'Credentials' : 'Connect Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'guide'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-white'
            )}
          >
            <Database className="w-4 h-4" />
            <span>Setup Guide (SQL)</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{actionError}</span>
          </div>
        )}

        {/* TAB 1: SYNC DASHBOARD & STATUS */}
        {activeTab === 'status' && isEnabled && (
          <div className="space-y-4">
            {/* Realtime Status Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[var(--bg-surface)] to-emerald-500/5 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-sm">
                    <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">
                      Supabase Real-Time Sync Active
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Changes made on PC or Phone sync immediately across both devices
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                    Vault Sync Code
                  </span>
                  <span className="font-mono font-bold text-amber-300 truncate block mt-0.5">
                    {vaultId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                    Last Synced
                  </span>
                  <span className="font-mono text-[var(--text-primary)] truncate block mt-0.5">
                    {lastSyncedAt
                      ? new Date(lastSyncedAt).toLocaleTimeString()
                      : 'Never'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                    Auto-Sync
                  </span>
                  <span className="text-emerald-400 font-semibold block mt-0.5">
                    {autoSync ? 'Enabled' : 'Manual'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Sync Actions */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <h5 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                Manual Actions
              </h5>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleManualPush}
                  disabled={isSyncing}
                  className="flex-1 min-w-[140px] justify-center"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isSyncing && 'animate-spin')} />
                  Push Local to Cloud
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManualPull}
                  disabled={isSyncing}
                  className="flex-1 min-w-[140px] justify-center"
                >
                  <Cloud className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Pull Cloud to Local
                </Button>
              </div>
            </div>

            {/* 1-Click Mobile Setup Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-[var(--bg-surface)] to-amber-500/10 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">
                    1-Click Connect on Phone (iPhone / Android)
                  </h5>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    No need to re-type long keys on your phone. Just send this link to your phone!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyMobileLink}
                  className="w-full justify-center bg-purple-500/20 border-purple-500/40 text-purple-200 hover:bg-purple-500/30 font-bold"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                      Copied! Paste in Telegram/Zalo to open on iPhone
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5 text-purple-300" />
                      Copy 1-Click Sync Link for Mobile
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Disconnect Option */}
            <div className="pt-2 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>Need to switch Supabase projects or disconnect?</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Disconnect this device from Supabase Cloud Sync? (Local data will not be deleted)')) {
                    disconnect();
                    setActiveTab('connect');
                  }
                }}
                className="text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer"
              >
                Disconnect Sync
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONNECT CREDENTIALS FORM */}
        {(activeTab === 'connect' || !isEnabled) && (
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Enter your Supabase project credentials and a <strong>Vault Sync Code</strong>. Any device (PC or Phone) using this code will sync your 1,416 sessions and games in real time!
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Supabase Project URL
                </label>
                <Input
                  placeholder="https://your-project.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isTesting || isSyncing}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Supabase Anon (Public) Key
                </label>
                <Input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  disabled={isTesting || isSyncing}
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Found in your Supabase dashboard under: <strong>Project Settings ➔ API ➔ Project API keys ➔ anon (public)</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Vault Sync Code (Unique room identifier)
                </label>
                <Input
                  placeholder="e.g. huy-vault-2026"
                  value={vaultInput}
                  onChange={(e) => setVaultInput(e.target.value)}
                  disabled={isTesting || isSyncing}
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Choose any secret code for your collection (e.g. <code>huy-vault-2026</code>). Enter the exact same code on your phone to connect!
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('guide')}
              >
                Need Help? View SQL Setup
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isTesting || isSyncing}
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Testing Connection...
                  </>
                ) : isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Uploading Vault Data...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Connect &amp; Start Sync
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: SETUP GUIDE & SQL SCRIPT */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">
                How to set up Supabase Cloud Sync (Free Forever):
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-secondary)] leading-relaxed">
                <li>
                  Create a free project at{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-neon)] hover:underline inline-flex items-center gap-0.5 font-bold"
                  >
                    supabase.com <ExternalLink className="w-3 h-3" />
                  </a>
                  {' '}(takes 1 minute).
                </li>
                <li>
                  Go to <strong>SQL Editor</strong> in the left sidebar of your Supabase dashboard.
                </li>
                <li>
                  Click <strong>New query</strong>, paste the script below, and click <strong>RUN</strong>.
                </li>
                <li>
                  Go to <strong>Project Settings ➔ API</strong>, copy your <strong>Project URL</strong> and <strong>anon key</strong>, and paste them into the Connect tab!
                </li>
              </ol>
            </div>

            {/* SQL Script Box with Copy Button */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-black/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
                <span className="font-mono text-[11px] text-[var(--text-muted)] font-bold">
                  setup_vault_table.sql
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                {SQL_SETUP_SCRIPT}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setActiveTab('connect')}>
                Got it, take me to Connect
              </Button>
            </div>
          </div>
        )}

        {/* Modal Bottom Status Bar */}
        <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                isEnabled
                  ? syncStatus === 'error'
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-emerald-400'
                  : 'bg-zinc-500'
              )}
            />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              {isEnabled
                ? syncStatus === 'syncing'
                  ? 'Syncing changes...'
                  : syncStatus === 'error'
                  ? 'Sync Error'
                  : 'Connected & Synced'
                : 'Not Connected'}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
