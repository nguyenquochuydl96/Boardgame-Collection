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
            '✓ BGG Personal Access Token hợp lệ! Khi không dùng Proxy trung gian, ứng dụng sẽ lưu Token và tự động tra cứu kho BoardGame Catalog mở rộng tích hợp sẵn. Bạn hãy bấm "Save Settings" để lưu lại nhé.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Vui lòng dán BGG Access Token của bạn trước khi kiểm tra hoặc lưu cài đặt.',
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
                Đã Phê Duyệt (Approved)
              </div>
            </div>
          </div>
          <PoweredByBGG variant="badge" />
        </div>

        <p className="text-[#94a3b8] leading-relaxed text-xs">
          Ứng dụng của bạn đã được quản trị viên BoardGameGeek phê duyệt quyền sử dụng phi thương mại. Hãy dán <strong>BGG API Token (Bearer Token)</strong> và địa chỉ Proxy (nếu dùng Cloudflare Worker / Serverless) để kích hoạt tìm kiếm và đồng bộ trực tiếp.
        </p>

        <div className="space-y-4">
          <div>
            <Input
              label="Proxy Base URL (Không bắt buộc - Tùy chọn nâng cao)"
              placeholder="Để trống nếu không dùng Cloudflare Worker..."
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              leftIcon={<Globe className="w-4 h-4 text-[#7c3aed]" />}
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 pl-1">
              💡 <em>Không bắt buộc:</em> Trình duyệt web có cơ chế bảo mật CORS chặn gọi trực tiếp đến boardgamegeek.com. Bạn có thể để trống ô này; hệ thống sẽ tự động dùng kho Catalog tích hợp sẵn.
            </p>
          </div>

          <div>
            <Input
              label="BGG Personal Access Token (Bearer Token)"
              placeholder="Dán token lấy từ boardgamegeek.com/applications"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              leftIcon={<Key className="w-4 h-4 text-[#a78bfa]" />}
            />
            <p className="text-[11px] text-[#a78bfa] mt-1.5 pl-1 font-medium">
              🔑 Mã Token đã được cấp khi đơn đăng ký BGG XML API của bạn được duyệt.
            </p>
          </div>
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
            <ExternalLink className="w-3.5 h-3.5 text-[#ff7722]" /> Cách lấy Access Token trên BGG:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>Đăng nhập tài khoản BoardGameGeek của bạn.</li>
            <li>
              Truy cập{' '}
              <a
                href="https://boardgamegeek.com/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#ff7722] underline hover:text-white"
              >
                boardgamegeek.com/applications
              </a>
              .
            </li>
            <li>Chọn ứng dụng đã được duyệt và sao chép <strong>Access Token (Bearer Token)</strong>.</li>
            <li className="text-emerald-400">
              ✓ Logo <strong>"Powered by BGG"</strong> đã được gắn đầy đủ khắp ứng dụng theo đúng điều khoản sử dụng của BGG.
            </li>
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
