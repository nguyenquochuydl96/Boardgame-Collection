/**
 * Resolves local image URLs to support both root-domain deployment (Vercel, custom domain)
 * and subpath deployment (GitHub Pages: /Boardgame-Collection/).
 */
export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${base.endsWith('/') ? base : base + '/'}${cleanPath}`;
}
