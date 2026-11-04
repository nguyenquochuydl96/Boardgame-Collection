import React, { useState } from 'react';
import { Globe, Key, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getBGGApiToken, getBGGProxyUrl, saveBGGSettings } from '../../lib/bgg';

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
      setTestResult({
        success: false,
        message: 'Please enter a Proxy URL before testing.',
      });
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
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connection successful! Received ${Array.isArray(data) ? data.length : 1} search results from BGG.`,
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
        <p className="text-[#94a3b8] leading-relaxed">
          Configure a serverless proxy (Cloudflare Worker or Vercel) and your BGG Access Token to enable live catalog search and collection sync.
        </p>

        <div className="space-y-4">
          <Input
            label="Proxy Base URL"
            placeholder="e.g. https://bgg-proxy.your-subdomain.workers.dev"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            leftIcon={<Globe className="w-4 h-4 text-[#7c3aed]" />}
          />

          <Input
            label="BGG Personal Access Token (Bearer Token)"
            placeholder="Paste token from boardgamegeek.com/applications"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            leftIcon={<Key className="w-4 h-4 text-[#a78bfa]" />}
          />
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
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

        <div className="p-4 rounded-2xl bg-[#1e1e35]/60 border border-white/10 space-y-2 text-xs text-[#94a3b8]">
          <p className="font-bold text-white flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-[#22d3ee]" /> How to get a BGG Token:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Log into your account on BoardGameGeek.</li>
            <li>Visit <span className="font-mono text-white">boardgamegeek.com/applications</span>.</li>
            <li>Register an application and copy your generated Access Token.</li>
          </ol>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
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
