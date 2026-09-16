import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Servido em /robots.txt. Libera o site público (landing + páginas de negócio
// /[slug]) e bloqueia o que não deve indexar: painel admin, onboarding e fluxos
// de autenticação sensíveis.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/onboarding',
        '/login',
        '/recuperar-senha',
        '/redefinir-senha',
        '/convite',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
