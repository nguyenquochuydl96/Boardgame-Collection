import React from 'react';
import { Search, Sparkles } from 'lucide-react';
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

  const handlePick = async (bggId: string) => {
    const detail = await fetchDetail(bggId);
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
          autoFocus
        />

        {isLoading || isFetchingDetail ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {results.map((item) => (
              <button
                key={item.bggId}
                type="button"
                onClick={() => void handlePick(item.bggId)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e1e35]/80 hover:bg-[#7c3aed]/20 border border-white/10 hover:border-[#7c3aed]/50 text-left transition-all cursor-pointer group"
              >
                <BGGCardThumbnail
                  src={item.thumbnail || item.image}
                  name={item.name}
                  className="w-12 h-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm text-[#f1f5f9] truncate group-hover:text-[#a78bfa]">
                    {item.name}
                  </p>
                  {item.yearPublished && (
                    <p className="text-xs text-[#94a3b8] tabular-nums mt-0.5">
                      Published {item.yearPublished}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#22d3ee] mt-1 font-medium">
                    <Sparkles className="w-3 h-3" />
                    Import BGG Details
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BGGSearchModal;
