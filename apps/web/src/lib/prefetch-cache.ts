const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CacheEntry<T = unknown> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const TTL = 30_000;

export function prefetchApi(path: string, token: string): void {
  const key = path;
  const existing = cache.get(key);
  if (existing && Date.now() - existing.ts < TTL) return;
  if (inflight.has(key)) return;

  const promise = fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data !== null) cache.set(key, { data, ts: Date.now() });
      inflight.delete(key);
      return data;
    })
    .catch(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
}

export function getCached<T>(path: string): T | null {
  const entry = cache.get(path);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) {
    cache.delete(path);
    return null;
  }
  return entry.data as T;
}

export function invalidateCache(path: string): void {
  cache.delete(path);
}

const ROUTE_API_MAP: Record<string, string> = {
  '/admin': '/appointments',
  '/admin/clientes': '/clients',
  '/admin/professionals': '/professionals',
  '/admin/services': '/services',
  '/admin/working-hours': '/working-hours',
  '/admin/schedule-blocks': '/schedule-blocks',
  '/admin/equipe': '/staff',
  '/admin/financeiro': '/appointments',
  '/admin/customization': '/customization',
};

export function prefetchForRoute(route: string, token: string): void {
  const apiPath = ROUTE_API_MAP[route];
  if (apiPath) prefetchApi(apiPath, token);
}
