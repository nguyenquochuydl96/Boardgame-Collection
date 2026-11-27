import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleCancel = onCancel ?? onClose ?? (() => {});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconBgStyle: React.CSSProperties = isDanger
    ? { background: 'var(--bad-soft)', color: 'var(--bad)', borderColor: 'color-mix(in srgb, var(--bad) 30%, transparent)' }
    : isWarning
    ? { background: 'var(--warn-soft)', color: 'var(--warn)', borderColor: 'color-mix(in srgb, var(--warn) 30%, transparent)' }
    : { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' };

  const confirmBgStyle: React.CSSProperties = isDanger
    ? { background: 'var(--bad)', color: '#FFFFFF' }
    : isWarning
    ? { background: 'var(--warn)', color: '#FFFFFF' }
    : { background: 'var(--accent)', color: 'var(--accent-ink)' };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
            style={iconBgStyle}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                id="confirm-modal-title"
                className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug"
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Close dialog"
                className="w-9 h-9 -mr-1.5 -mt-1.5 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p
              id="confirm-modal-desc"
              className="mt-2 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-line"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-10 px-4 py-2 rounded-full text-sm font-semibold border border-[var(--line)] bg-[var(--card-2)] text-[var(--ink)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={confirmBgStyle}
            className="min-h-10 px-5 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
