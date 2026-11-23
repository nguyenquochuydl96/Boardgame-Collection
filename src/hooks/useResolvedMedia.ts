import { useState, useEffect } from 'react';
import { isIdbMediaRef, getMediaImage } from '../lib/mediaStorage';

/**
 * Hook to resolve an image source that might be an IndexedDB reference (`idb://...`).
 * Returns regular URLs and data URLs immediately without re-rendering delay.
 * If the IndexedDB blob cannot be found (e.g. after clearing browser cache),
 * automatically falls back to `fallback` if provided.
 */
export function useResolvedMedia(src?: string | null, fallback?: string): string | undefined {
  const isIdb = isIdbMediaRef(src);
  const safeFallback = fallback && !isIdbMediaRef(fallback) ? fallback : undefined;

  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!src) return safeFallback;
    if (!isIdb) return src;
    return safeFallback;
  });

  useEffect(() => {
    if (!src) {
      setResolved(safeFallback);
      return;
    }
    if (!isIdbMediaRef(src)) {
      setResolved(src);
      return;
    }

    let active = true;
    getMediaImage(src).then((data) => {
      if (active) {
        setResolved(data || safeFallback || undefined);
      }
    });

    return () => {
      active = false;
    };
  }, [src, safeFallback]);

  return isIdb ? (resolved || safeFallback) : (src || safeFallback);
}
