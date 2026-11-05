import React, { memo } from 'react';
import { BoardGame } from '../../types';
import { GameCard } from './GameCard';

export interface GameGridProps {
  games: BoardGame[];
  playCountsByGameId: Record<string, number>;
  viewMode?: 'grid' | 'list';
  onEdit?: (game: BoardGame) => void;
}

export const GameGrid: React.FC<GameGridProps> = memo(({
  games,
  playCountsByGameId,
  viewMode = 'grid',
  onEdit,
}) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            playCount={playCountsByGameId[game.id] || 0}
            viewMode="list"
            onEdit={onEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          playCount={playCountsByGameId[game.id] || 0}
          viewMode="grid"
          onEdit={onEdit}
        />
      ))}
    </div>
  );
});

export default GameGrid;
