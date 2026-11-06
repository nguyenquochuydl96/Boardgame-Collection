import React, { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { BGGGameDetail } from '../../types';
import { useBGGSearch } from '../../hooks/useBGGSearch';
import { BGGCardThumbnail } from './BGGCardThumbnail';

export interface BGGSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (detail: BGGGameDetail) => void;
}

export const BGGSearchModal: React.FC<BGGSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  const { query, setQuery, results, isLoading, isFetchingDetail, fetchDetail } =
    useBGGSearch('');
  const [pickingId, setPickingId] = useState<string | null>(null);

  const handlePick = async (bggId: string) => {
    setPickingId(bggId);
    const detail = await fetchDetail(bggId);
    setPickingId(null);
    if (detail) {
      onSelectGame(detail);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search BoardGameGeek"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <Input
          placeholder="Search any boardgame (e.g., Wingspan, Azul, Brass)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          rightIcon={
            isLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline text-[11px] font-mono">BGG...</span>
              </div>
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-5 h-5 rounded-full bg-[var(--card-3)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="Clear search"
              >
                ✕
              </button>
            ) : null
          }
          autoFocus
        />

        {isLoading && results.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-20 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted)] bg-[var(--card-2)] rounded-xl border border-[var(--line)]">
            No matching boardgames found for &quot;{query}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {results.map((item) => {
              const isThisPicking = pickingId === item.bggId || (isFetchingDetail && pickingId === item.bggId);
              return (
                <button
                  key={item.bggId}
                  type="button"
                  disabled={isFetchingDetail}
                  onClick={() => void handlePick(item.bggId)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--card-2)] hover:bg-[var(--accent)]/15 border border-[var(--line)] hover:border-[var(--accent)] text-left transition-all cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <BGGCardThumbnail
                    src={item.thumbnail || item.image}
                    name={item.name}
                    className="w-12 h-16"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-display font-bold text-sm text-[var(--ink)] truncate group-hover:text-[var(--accent)]">
                        {item.name}
                      </p>
                      {isThisPicking && (
                        <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin shrink-0" />
                      )}
                    </div>
                    {item.yearPublished && (
                      <p className="text-xs text-[var(--muted)] tabular-nums mt-0.5">
                        Published {item.yearPublished}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] mt-1 font-bold">
                      {isThisPicking ? (
                        'Importing BGG details...'
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Import BGG Details
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BGGSearchModal;
