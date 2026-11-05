import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Dices,
  Zap,
  Wifi,
} from 'lucide-react';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Detect iOS Safari / iPad
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        onInstallSuccess?.();
        onClose();
      }
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pwa-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={onClose}
        >
          <motion.div
            key="pwa-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="bg-[#16162a] rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-white/10 relative cursor-default text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#2563eb] to-[#0ea5e9] flex items-center justify-center shadow-xl shadow-purple-500/25 mb-3 border border-white/20">
                <Dices className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-display font-extrabold text-white tracking-tight">
                Install BoardGame Vault
              </h3>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                Add to your mobile home screen for a seamless fullscreen, native-like tabletop companion app
              </p>
            </div>

            {/* Native 1-Click Install Button (Chrome / Edge / Android) */}
            {deferredPrompt ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Your device is ready to install with 1 tap!</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Install to Home Screen</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari Guide */
              <div className="space-y-3 text-xs bg-[#1e1e35]/80 p-4 rounded-2xl border border-white/10">
                <div className="font-bold text-white flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4 text-[#a78bfa]" />
                  <span>Install on iPhone / iPad (Safari):</span>
                </div>
                <ol className="space-y-2.5 text-[11px] text-[#cbd5e1] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      Tap the <strong>Share</strong> button{' '}
                      <Share className="w-3.5 h-3.5 inline text-sky-400 mx-0.5" /> in Safari's bottom toolbar.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      Scroll down and select <strong>Add to Home Screen</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-amber-300 mx-0.5" />.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      Tap <strong>Add</strong> in the top right corner. The BoardGame Vault app icon will appear right on your home screen!
                    </div>
                  </li>
                </ol>
              </div>
            ) : (
              /* General Mobile / Chrome manual */
              <div className="space-y-3 text-xs bg-[#1e1e35]/80 p-4 rounded-2xl border border-white/10">
                <div className="font-bold text-white flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Add to Home Screen:</span>
                </div>
                <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
                  In your mobile browser (Chrome, Edge, or Samsung Internet), tap the <strong>⋮</strong> menu icon in the top corner and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                </p>
              </div>
            )}

            {/* Feature Perks */}
            <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-white">Instant Launch</p>
                <p className="text-[9px] text-[#94a3b8]">Home screen icon</p>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <Smartphone className="w-4 h-4 text-[#a78bfa] mx-auto mb-1" />
                <p className="text-[10px] font-bold text-white">Fullscreen</p>
                <p className="text-[9px] text-[#94a3b8]">No browser bars</p>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <Wifi className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-white">Works Offline</p>
                <p className="text-[9px] text-[#94a3b8]">Play anywhere</p>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaInstallModal;
