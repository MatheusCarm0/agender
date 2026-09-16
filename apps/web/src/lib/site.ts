// URL pública canônica do site (produção). Usada em metadata, canonical,
// robots.txt e sitemap.xml. Sobrescreva com NEXT_PUBLIC_SITE_URL no build.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://agender.app.br'
).replace(/\/$/, '');
