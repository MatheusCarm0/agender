import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Servido em /sitemap.xml. Páginas públicas estáticas. As páginas por negócio
// (/[slug]) podem ser adicionadas depois puxando os slugs da API.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, freq: 'weekly' },
    { path: '/register', priority: 0.9, freq: 'monthly' },
    { path: '/login', priority: 0.4, freq: 'yearly' },
    { path: '/faq', priority: 0.6, freq: 'monthly' },
    { path: '/termos', priority: 0.3, freq: 'yearly' },
    { path: '/privacidade', priority: 0.3, freq: 'yearly' },
  ];
  return entries.map(({ path, priority, freq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));
}
