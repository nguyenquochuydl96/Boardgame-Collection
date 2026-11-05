import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from './cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Modal dialog'}
        >
          {/* Backdrop with dark tint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-[#17130f]/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal container with Rayé brutalist styling & spring zoom */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={cn(
              'relative z-10 w-full rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--teal)] sm:shadow-[10px_10px_0_var(--teal)] overflow-hidden my-auto max-h-[90vh] flex flex-col',
              maxWidthClass
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--ink)] bg-[var(--paper)] shrink-0">
                <h2 className="text-xl font-extrabold font-display tracking-tight text-[var(--text-primary)]">
                  {title}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-[var(--butter)] border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--coral)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            )}
            <div className="p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
