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

// Cada rota mapeia para o(s) endpoint(s) que a página pinta na hora via getCached.
// api() não lê deste cache, então mapear endpoints que a página não lê do cache
// só geraria requisição duplicada — mapeamos apenas o endpoint primário de cada tela.
const ROUTE_API_MAP: Record<string, string[]> = {
  '/admin': ['/appointments'],
  '/admin/clientes': ['/clients?page=1&limit=20'],
  '/admin/professionals': ['/professionals'],
  '/admin/services': ['/services', '/professionals'],
  '/admin/working-hours': ['/professionals'],
  '/admin/schedule-blocks': ['/schedule-blocks'],
  '/admin/recurring-blocks': ['/recurring-blocks'],
  '/admin/equipe': ['/staff'],
  '/admin/campanhas': ['/campaigns'],
  '/admin/cupons': ['/coupons'],
  '/admin/fidelidade': ['/membership-plans'],
  '/admin/notificacoes': ['/notifications/log'],
  '/admin/plano': ['/plan-subscription'],
  '/admin/recebimento': ['/payment-account'],
  '/admin/customization': ['/customization'],
};

export function prefetchForRoute(route: string, token: string): void {
  const apiPaths = ROUTE_API_MAP[route];
  if (apiPaths) apiPaths.forEach((p) => prefetchApi(p, token));
}
