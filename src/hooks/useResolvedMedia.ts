import { useState, useEffect } from 'react';
import { isIdbMediaRef, getMediaImage } from '../lib/mediaStorage';

/**
 * Hook to resolve an image source that might be an IndexedDB reference (`idb://...`).
 * Returns regular URLs and data URLs immediately without re-rendering delay.
 */
export function useResolvedMedia(src?: string | null): string | undefined {
  const isIdb = isIdbMediaRef(src);
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!src) return undefined;
    if (!isIdb) return src;
    return undefined;
  });

  useEffect(() => {
    if (!src) {
      setResolved(undefined);
      return;
    }
    if (!isIdbMediaRef(src)) {
      setResolved(src);
      return;
    }

    let active = true;
    getMediaImage(src).then((data) => {
      if (active) {
        setResolved(data || undefined);
      }
    });

    return () => {
      active = false;
    };
  }, [src]);

  return isIdb ? resolved : (src || undefined);
}
