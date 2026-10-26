/** Resolve a content path (e.g. "images/memories/memory-01.jpg") against the site base. */
export function asset(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return import.meta.env.BASE_URL + String(path).replace(/^\/+/, '');
}
