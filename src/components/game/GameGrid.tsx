import React from 'react';
import { motion } from 'motion/react';
import { BoardGame } from '../../types';
import { GameCard } from './GameCard';

export interface GameGridProps {
  games: BoardGame[];
  playCountsByGameId: Record<string, number>;
  viewMode?: 'grid' | 'list';
  onEdit?: (game: BoardGame) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  playCountsByGameId,
  viewMode = 'grid',
  onEdit,
}) => {
  if (viewMode === 'list') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {games.map((game) => (
          <motion.div key={game.id} variants={itemVariants}>
            <GameCard
              game={game}
              playCount={playCountsByGameId[game.id] || 0}
              viewMode="list"
              onEdit={onEdit}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
    >
      {games.map((game) => (
        <motion.div key={game.id} variants={itemVariants} className="h-full">
          <GameCard
            game={game}
            playCount={playCountsByGameId[game.id] || 0}
            viewMode="grid"
            onEdit={onEdit}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default GameGrid;
