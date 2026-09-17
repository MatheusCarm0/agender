import type { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.SITE_URL ||
  process.env.WEB_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

// Ver nota em sitemap.ts: renderizado por request para ler SITE_URL do runtime.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Áreas privadas/transacionais que não devem ser indexadas.
      disallow: [
        '/admin',
        '/onboarding',
        '/bem-vindo',
        '/login',
        '/register',
        '/recuperar-senha',
        '/redefinir-senha',
        '/convite',
        '/api',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
