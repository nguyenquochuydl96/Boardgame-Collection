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
            className="bg-[var(--card)] rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-[var(--line-2)] relative cursor-default text-[var(--ink)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-xl shadow-[var(--accent)]/20 mb-3 border border-[var(--line-2)]">
                <Dices className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-display font-extrabold text-[var(--ink)] tracking-tight">
                Install Heo&apos;s Board Game Collection
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Add to your mobile home screen for a seamless fullscreen, native-like tabletop companion app
              </p>
            </div>

            {/* Native 1-Click Install Button (Chrome / Edge / Android) */}
            {deferredPrompt ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Your device is ready to install with 1 tap!</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-[var(--accent-ink)] bg-[var(--accent)] hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download className="w-4 h-4 text-current" />
                  <span>Install to Home Screen</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari Guide */
              <div className="space-y-3 text-xs bg-[var(--card-2)] p-4 rounded-2xl border border-[var(--line)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4 text-[var(--accent)]" />
                  <span>Install on iPhone / iPad (Safari):</span>
                </div>
                <ol className="space-y-2.5 text-[11px] text-[var(--muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[var(--card-3)] text-[var(--ink)] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      Tap the <strong className="text-[var(--ink)]">Share</strong> button{' '}
                      <Share className="w-3.5 h-3.5 inline text-sky-500 mx-0.5" /> in Safari&apos;s bottom toolbar.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[var(--card-3)] text-[var(--ink)] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      Scroll down and select <strong className="text-[var(--ink)]">Add to Home Screen</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-amber-500 mx-0.5" />.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[var(--card-3)] text-[var(--ink)] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      Tap <strong className="text-[var(--ink)]">Add</strong> in the top right corner. The app icon will appear right on your home screen!
                    </div>
                  </li>
                </ol>
              </div>
            ) : (
              /* General Mobile / Chrome manual */
              <div className="space-y-3 text-xs bg-[var(--card-2)] p-4 rounded-2xl border border-[var(--line)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Add to Home Screen:</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  In your mobile browser (Chrome, Edge, or Samsung Internet), tap the <strong className="text-[var(--ink)]">⋮</strong> menu icon in the top corner and select <strong className="text-[var(--ink)]">&quot;Install app&quot;</strong> or <strong className="text-[var(--ink)]">&quot;Add to Home screen&quot;</strong>.
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
