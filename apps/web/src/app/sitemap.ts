import type { MetadataRoute } from 'next';

// Base pública do site (domínio de marketing). Vem por env do container web
// (SITE_URL, espelho do WEB_URL); cai para localhost em dev. Sem a barra final
// para não gerar URLs com "//".
const SITE_URL = (
  process.env.SITE_URL ||
  process.env.WEB_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

// force-dynamic: o sitemap é renderizado a cada request, então lê SITE_URL do
// ambiente de RUNTIME. Sem isso o Next geraria o XML no build (onde SITE_URL
// não existe) e cravaria localhost no arquivo.
export const dynamic = 'force-dynamic';

// Páginas públicas de marketing indexáveis. As páginas por tenant (/[slug]) são
// dinâmicas e ficam de fora deste sitemap institucional.
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/termos', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacidade', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
