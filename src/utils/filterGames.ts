import { BoardGame } from '../types/boardgame';
import { FilterState } from '../components/MultiFilterModal';

export function filterAndSortGames(
  games: BoardGame[],
  searchQuery: string,
  filters: FilterState
): BoardGame[] {
  let result = games.filter((game) => {
    // 1. Text Search (Name, Vietnamese Name, Publisher, Category, Notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        game.name.toLowerCase().includes(q) ||
        (game.vietnameseName && game.vietnameseName.toLowerCase().includes(q)) ||
        game.publisher.toLowerCase().includes(q) ||
        game.category.toLowerCase().includes(q) ||
        (game.authenticityNotes && game.authenticityNotes.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Cabinet Filter (Real / Fake)
    if (filters.cabinet !== 'all' && game.cabinetType !== filters.cabinet) {
      return false;
    }

    // 3. Status Filter (On Hand / OOS)
    if (filters.status !== 'all') {
      const status = game.status || 'On Hand';
      if (status !== filters.status) return false;
    }

    // 4. Game Type (Base / Expansion)
    if (filters.gameType !== 'all') {
      const isExp = game.gameType === 'Expansion';
      if (filters.gameType === 'expansion' && !isExp) return false;
      if (filters.gameType === 'base' && isExp) return false;
    }

    // 5. Player Count Filter
    if (filters.playerCount !== 'all') {
      if (filters.playerCount === '1' && game.minPlayers !== 1) return false;
      if (filters.playerCount === '2' && (game.minPlayers > 2 || game.maxPlayers < 2)) return false;
      if (filters.playerCount === '3-4' && (game.minPlayers > 4 || game.maxPlayers < 3)) return false;
      if (filters.playerCount === '5-6' && (game.minPlayers > 6 || game.maxPlayers < 5)) return false;
      if (filters.playerCount === '7+' && game.maxPlayers < 7) return false;
    }

    // 6. Playtime Filter
    if (filters.playtime !== 'all') {
      // Estimate playtime from string, e.g. "30-45m", "120m", "45 Min", etc.
      const matchMin = game.playtime.match(/\d+/);
      const minutes = matchMin ? parseInt(matchMin[0], 10) : 45;
      if (filters.playtime === 'quick' && minutes > 30) return false;
      if (filters.playtime === 'medium' && (minutes < 30 || minutes > 60)) return false;
      if (filters.playtime === 'standard' && (minutes < 60 || minutes > 90)) return false;
      if (filters.playtime === 'long' && minutes < 90) return false;
    }

    // 7. BGG Rating Filter
    if (filters.minRating > 0 && (game.rating || 0) < filters.minRating) {
      return false;
    }

    // 8. Category Filter
    if (filters.category !== 'all') {
      const catLower = game.category.toLowerCase();
      if (filters.category === 'strategy' && !catLower.includes('strategy') && !catLower.includes('economic')) return false;
      if (filters.category === 'deck' && !catLower.includes('deck') && !catLower.includes('card')) return false;
      if (filters.category === 'party' && !catLower.includes('party') && !catLower.includes('deduction') && !catLower.includes('bluffing')) return false;
      if (filters.category === 'coop' && !catLower.includes('coop')) return false;
      if (filters.category === 'worker' && !catLower.includes('worker')) return false;
      if (filters.category === 'thematic' && !catLower.includes('thematic') && !catLower.includes('adventure') && !catLower.includes('war')) return false;
    }

    return true;
  });

  // Sort
  if (filters.sortBy === 'rating-desc') {
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (filters.sortBy === 'price-desc') {
    result.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (filters.sortBy === 'price-asc') {
    result.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (filters.sortBy === 'name-asc') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filters.sortBy === 'year-desc') {
    result.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  return result;
}
