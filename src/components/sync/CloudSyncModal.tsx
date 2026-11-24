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
import { ConfirmModal } from '../ui/ConfirmModal';
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
import { formatNumber } from '../../lib/utils';

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
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  const handleForceAppUpdate = async () => {
    setIsUpdatingApp(true);
    try {
      if (typeof window !== 'undefined' && (window as any).forceAppUpdate) {
        await (window as any).forceAppUpdate();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

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
      setActionError('Please fill in all three fields: Supabase URL, Anon Key, and Sync Room Code.');
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
    setActionSuccess('Successfully connected! Syncing collection with cloud...');

    // Pull from cloud first to download remote data and avoid pushing empty/default state
    setIsSyncing(true);
    const localGames = useGameStore.getState().games.length;
    const localSessions = useSessionStore.getState().sessions.length;
    const isLocalEmpty = localGames === 0 && localSessions === 0;

    const pullRes = await pullVaultFromCloud(isLocalEmpty ? 'replace' : 'merge');
    setIsSyncing(false);

    if (pullRes.success) {
      setActionSuccess('Connected and synced your collection with Supabase Cloud!');
      setActiveTab('status');
    } else {
      setActionError(pullRes.error || 'Failed to sync initial collection data.');
    }
  };

  const handleManualPush = async () => {
    setIsSyncing(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await pushVaultToCloud();
    setIsSyncing(false);

    if (res.success) {
      setActionSuccess(`Uploaded ${formatNumber(games.length)} games and ${formatNumber(sessions.length)} sessions to Cloud!`);
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
        `Downloaded ${formatNumber(res.count?.games ?? 0)} games and ${formatNumber(res.count?.sessions ?? 0)} sessions from Cloud!`
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
        <div className="flex gap-1 sm:gap-2 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {isEnabled && (
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={cn(
                'flex-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center',
                activeTab === 'status'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
              )}
            >
              <CloudCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Sync Dashboard</span>
              <span className="sm:hidden">Status</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={cn(
              'flex-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center',
              activeTab === 'connect'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
            )}
          >
            <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">{isEnabled ? 'Credentials' : 'Connect Cloud'}</span>
            <span className="sm:hidden">{isEnabled ? 'Keys' : 'Connect'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={cn(
              'flex-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center',
              activeTab === 'guide'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
            )}
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Setup Guide (SQL)</span>
            <span className="sm:hidden">Guide</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-[var(--good-soft)] border border-[var(--good)]/30 text-[var(--good)] text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0 text-[var(--good)]" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-[var(--bad-soft)] border border-[var(--bad)]/30 text-[var(--bad)] text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--bad)] mt-0.5" />
            <span className="leading-relaxed">{actionError}</span>
          </div>
        )}

        {/* TAB 1: SYNC DASHBOARD & STATUS */}
        {activeTab === 'status' && isEnabled && (
          <div className="space-y-4">
            {/* Realtime Status Banner */}
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--good-soft)] text-[var(--good)] flex items-center justify-center shadow-sm">
                    <Radio className="w-5 h-5 animate-pulse text-[var(--good)]" />
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
                <span className="px-2.5 py-1 rounded-full bg-[var(--good-soft)] border border-[var(--good)]/40 text-[var(--good)] text-[11px] font-bold">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--line)] text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                    Sync Room Code
                  </span>
                  <span className="font-mono font-bold text-[var(--accent)] truncate block mt-0.5">
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
                  <span className="text-[var(--good)] font-semibold block mt-0.5">
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
                  <h5 className="font-bold text-xs text-[var(--ink)]">
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
                  className="w-full justify-center bg-purple-500/15 border-purple-500/35 text-purple-700 dark:text-purple-200 hover:bg-purple-500/25 font-bold"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5 text-[var(--good)]" />
                      Copied! Send this link to open on your phone
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5 text-purple-600 dark:text-purple-300" />
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
                onClick={() => setIsDisconnectConfirmOpen(true)}
                className="text-[var(--bad)] hover:opacity-80 underline font-semibold cursor-pointer"
              >
                Disconnect Sync
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CONNECT CREDENTIALS FORM */}
        {(activeTab === 'connect' || !isEnabled) && (
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Enter your Supabase project credentials and a <strong>Sync Room Code</strong>. Any device (PC or Phone) using this code will sync your entire collection and play sessions in real time.
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
                  Sync Room Code (Unique room identifier)
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
                    Syncing Collection Data...
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
            <div className="rounded-xl border border-[var(--line)] bg-[#1B1816] text-[#F4EFE6] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10">
                <span className="font-mono text-[11px] text-[#A39B93] font-bold">
                  setup_collection_sync.sql
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--good)]" />
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
              <pre className="p-3 text-[11px] font-mono text-[#F4EFE6] overflow-x-auto max-h-48 leading-relaxed">
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

        {/* PWA Cache Purge & App Update (Accessible on iPhone / Mobile & Desktop) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
              <RefreshCw className={cn('w-4 h-4', isUpdatingApp && 'animate-spin')} />
            </div>
            <div className="min-w-0">
              <h5 className="font-bold text-xs text-[var(--ink)]">
                Check for Updates / Refresh Cache
              </h5>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Fetch the latest build and clear cached Service Worker assets on iOS / Safari.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleForceAppUpdate}
            disabled={isUpdatingApp}
            className="shrink-0 justify-center bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] border-[var(--accent)]/35 font-bold"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isUpdatingApp && 'animate-spin')} />
            {isUpdatingApp ? 'Updating...' : 'Update Now'}
          </Button>
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                isEnabled
                  ? syncStatus === 'error'
                    ? 'bg-[var(--bad)] animate-pulse'
                    : 'bg-[var(--good)]'
                  : 'bg-[var(--muted)]'
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

      <ConfirmModal
        isOpen={isDisconnectConfirmOpen}
        onClose={() => setIsDisconnectConfirmOpen(false)}
        onConfirm={() => {
          disconnect();
          setActiveTab('connect');
        }}
        title="Disconnect Cloud Sync?"
        message="This device will stop syncing with Supabase Cloud. Your local collection and sessions will remain safe on this device."
        confirmLabel="Disconnect"
        cancelLabel="Stay Connected"
        variant="danger"
      />
    </Modal>
  );
};
