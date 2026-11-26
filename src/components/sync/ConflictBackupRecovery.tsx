import React, { useState, useEffect } from 'react';
import { Database, Download, AlertTriangle, RefreshCw, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { listRecoverableSyncBackups, downloadRecoverableSyncBackup, type RecoverableSyncBackup } from '../../lib/conflictBackupRecovery';

interface ConflictBackupRecoveryProps {
  className?: string;
}

export const ConflictBackupRecovery: React.FC<ConflictBackupRecoveryProps> = ({ className }) => {
  const [backups, setBackups] = useState<RecoverableSyncBackup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listRecoverableSyncBackups();
      setBackups(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      await downloadRecoverableSyncBackup(id);
      setSuccessMessage(`Successfully exported conflict backup (${id.slice(0, 8)}) as VaultBackupData JSON.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export conflict backup');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={`p-4 bg-[var(--card)] rounded-xl border border-[var(--border-subtle)] space-y-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="font-semibold text-sm text-[var(--text-main)]">Recoverable Sync Conflict Backups</h3>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadBackups}
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        During cloud sync conflicts, secure point-in-time backups of local or cloud states are saved in your local database before overwrites. You can inspect and download them here in standard backup format.
      </p>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading conflict backups...</div>
      ) : backups.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)] bg-[var(--card-2)] rounded-lg border border-dashed border-[var(--border-subtle)]">
          No conflict backups found in local storage.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {backups.map((b) => (
            <div
              key={b.id}
              className="p-3 bg-[var(--card-2)] rounded-lg border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium text-[10px] uppercase tracking-wider ${
                      b.side === 'local'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {b.side} backup
                  </span>
                  <span className="text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-[var(--text-muted)] flex items-center gap-3">
                  <span>Games: {b.counts.games}</span>
                  <span>Players: {b.counts.players}</span>
                  <span>Sessions: {b.counts.sessions}</span>
                  <span>Locations: {b.counts.locations}</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] opacity-80 font-mono">
                  Room: {b.vaultId || 'unknown'}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownload(b.id)}
                disabled={downloadingId === b.id}
                className="flex items-center gap-1 shrink-0"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingId === b.id ? 'animate-bounce' : ''}`} />
                {downloadingId === b.id ? 'Exporting...' : 'Download'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
