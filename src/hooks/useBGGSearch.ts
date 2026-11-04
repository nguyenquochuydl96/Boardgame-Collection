import { useState, useEffect, useCallback } from 'react';
import { BGGGameDetail, BGGSearchResult } from '../types';
import { getBGGGameDetail, searchBGGGames, MOCK_BGG_CATALOG } from '../lib/bgg';

export function useBGGSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BGGSearchResult[]>(() =>
    MOCK_BGG_CATALOG.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await searchBGGGames(searchQuery);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search BGG');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void performSearch(query);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const fetchDetail = useCallback(async (bggId: string): Promise<BGGGameDetail | null> => {
    setIsFetchingDetail(true);
    setError(null);
    try {
      return await getBGGGameDetail(bggId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
      return null;
    } finally {
      setIsFetchingDetail(false);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isFetchingDetail,
    error,
    performSearch,
    fetchDetail,
  };
}

export default useBGGSearch;
