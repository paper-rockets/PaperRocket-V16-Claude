/**
 * Utility to resolve static asset paths against Vite's configured BASE_URL.
 * Handles root-relative paths ('/models/...'), relative paths ('models/...'),
 * and passes through remote URLs (http, https, blob, data).
 */
export function resolveAssetUrl(path: string): string {
  if (!path) return path;

  // Pass through absolute network or in-memory blob/data URLs
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Strip leading slash to normalize path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = (import.meta as any).env?.BASE_URL || './';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}${cleanPath}`;
}
