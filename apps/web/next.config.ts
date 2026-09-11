import type { NextConfig } from 'next';

// As páginas públicas por tenant (/[slug], /[slug]/conta, /[slug]/agendar) são
// renderizadas no servidor (SSR) com dados por requisição — incompatível com
// `output: 'export'` (site estático), que exige generateStaticParams e quebra
// rotas dinâmicas. Rodamos o Next como servidor Node (next start) atrás do proxy.
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
