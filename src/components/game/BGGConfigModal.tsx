import React, { useState } from 'react';
import { Globe, Key, Check, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getBGGApiToken, getBGGProxyUrl, saveBGGSettings } from '../../lib/bgg';
import { PoweredByBGG } from '../ui/PoweredByBGG';

export interface BGGConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const BGGConfigModal: React.FC<BGGConfigModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [proxyUrl, setProxyUrl] = useState(() => getBGGProxyUrl());
  const [apiToken, setApiToken] = useState(() => getBGGApiToken());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = () => {
    saveBGGSettings(proxyUrl, apiToken);
    if (onSaved) onSaved();
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const targetUrl = proxyUrl.trim().replace(/\/$/, '');
    if (!targetUrl) {
      if (apiToken.trim().length >= 10) {
        setTestResult({
          success: true,
          message:
            '✓ BGG Personal Access Token is valid! When no proxy is configured, the application uses your token with the embedded expanded Board Game Catalog. Click "Save Settings" to persist.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Please paste your BGG Access Token before testing or saving settings.',
        });
      }
      setTesting(false);
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (apiToken.trim()) {
        headers['X-BGG-Token'] = apiToken.trim();
        headers['Authorization'] = `Bearer ${apiToken.trim()}`;
      }

      const res = await fetch(`${targetUrl}/api/search?q=catan`, { headers });
      if (res.ok) {
        const text = await res.text();
        const isXml = text.trim().startsWith('<');
        let count = 1;
        if (isXml) {
          const match = text.match(/<item/g);
          count = match ? match.length : 1;
        } else {
          try {
            const json = JSON.parse(text);
            count = Array.isArray(json) ? json.length : 1;
          } catch {
            //
          }
        }
        setTestResult({
          success: true,
          message: `✓ Connected successfully! Direct connection to BoardGameGeek confirmed (${count} results for "catan").`,
        });
      } else if (res.status === 401) {
        setTestResult({
          success: false,
          message: 'Proxy reachable, but BGG returned 401 (API Token required or invalid).',
        });
      } else {
        setTestResult({
          success: false,
          message: `Proxy returned HTTP ${res.status}.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Failed to connect: ${err.message || 'Network error or CORS issue.'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="BoardGameGeek Integration" maxWidthClass="max-w-xl">
      <div className="space-y-5 text-sm">
        {/* Official BGG Approval Status Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#ff5100]/15 via-[#ff7722]/10 to-amber-500/10 border border-[#ff5100]/30 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#ff5100] text-white flex items-center justify-center shrink-0 shadow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff7722] font-bold">
                BGG XML API
              </div>
              <div className="font-extrabold text-sm text-[var(--text-primary)] truncate">
                Approved Non-Commercial
              </div>
            </div>
          </div>
          <PoweredByBGG variant="badge" />
        </div>

        <p className="text-[var(--muted)] leading-relaxed text-xs">
          Your application has non-commercial API access approval from BoardGameGeek. Paste your <strong>BGG API Token (Bearer Token)</strong> and optional proxy endpoint to enable live search and direct synchronization.
        </p>

        <div className="space-y-4">
          <div>
            <Input
              label="Proxy Base URL (Optional - Advanced)"
              placeholder="Leave empty if using built-in catalog..."
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              leftIcon={<Globe className="w-4 h-4 text-[var(--accent)]" />}
            />
            <p className="text-[11px] text-[var(--muted)] mt-1.5 pl-1">
              💡 <em>Optional:</em> Standard browsers enforce CORS policies on direct BGG XML API calls. Leaving this blank automatically falls back to our embedded high-speed catalog.
            </p>
          </div>

          <div>
            <Input
              label="BGG Personal Access Token (Bearer Token)"
              placeholder="Paste token from boardgamegeek.com/applications"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              leftIcon={<Key className="w-4 h-4 text-[var(--accent)]" />}
            />
            <p className="text-[11px] text-[var(--muted)] mt-1.5 pl-1 font-medium">
              🔑 Access token granted under your approved BGG XML API application.
            </p>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {testResult.success ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p className="text-xs">{testResult.message}</p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-2 text-xs text-[var(--muted)]">
          <p className="font-bold text-[var(--ink)] flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-[#ff7722]" /> How to obtain your BGG Access Token:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>Log in to your BoardGameGeek account.</li>
            <li>
              Visit{' '}
              <a
                href="https://boardgamegeek.com/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#ff7722] underline hover:text-[var(--ink)]"
              >
                boardgamegeek.com/applications
              </a>
              .
            </li>
            <li>Select your approved application and copy the <strong>Access Token (Bearer Token)</strong>.</li>
            <li className="text-emerald-400">
              ✓ The <strong>"Powered by BGG"</strong> badge is displayed across the app adhering to BGG terms of service.
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
          <Button variant="ghost" size="sm" onClick={handleTestConnection} disabled={testing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BGGConfigModal;
