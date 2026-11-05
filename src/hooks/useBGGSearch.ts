import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { BGGGameDetail, BGGSearchResult } from '../types';
import { getBGGGameDetail, searchBGGGames, searchLocalBGG } from '../lib/bgg';

export function useBGGSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  // Results initialized instantly from local catalog with zero latency
  const [results, setResults] = useState<BGGSearchResult[]>(() => searchLocalBGG(initialQuery));
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Instant 0ms local response on query change:
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Instant local filter (0ms delay, runs immediately with high priority)
    const localMatches = searchLocalBGG(newQuery);
    startTransition(() => {
      setResults(localMatches);
    });
  }, []);

  // 2. Debounced background remote BGG proxy search (350ms):
  useEffect(() => {
    const cleanQ = query.trim();

    // Abort any existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (!cleanQ) {
      setIsSearchingRemote(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      setError(null);

      try {
        const liveResults = await searchBGGGames(cleanQ, controller.signal);
        if (!controller.signal.aborted && liveResults.length > 0) {
          startTransition(() => {
            setResults(liveResults);
          });
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Failed to search BGG');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingRemote(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

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
    setQuery: handleQueryChange,
    results,
    isLoading: isSearchingRemote,
    isSearchingRemote,
    isFetchingDetail,
    error,
    fetchDetail,
  };
}

export default useBGGSearch;
