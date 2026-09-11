import { notFound } from 'next/navigation';
import AccountClient from './account-client';

// Server component (SSR): fetch roda no Node do container — precisa de URL
// ABSOLUTA interna (API_INTERNAL_URL, ex.: http://api:3001), não o /api do browser.
const API_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

const DEFAULT_COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0D9488',
  text: '#1C1917',
};

interface BusinessLite {
  slug: string;
  name: string;
  logoUrl?: string;
  customization: {
    theme?: {
      colors?: { background: string; surface: string; primary: string; text: string };
      font?: string;
      buttonStyle?: string;
      logoUrl?: string;
    };
    headline?: string | null;
  } | null;
}

export async function generateStaticParams() {
  return [{ slug: 'agender' }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/public/v1/${slug}`, { cache: 'no-store' });
    if (!res.ok) return { title: 'Meus agendamentos' };
    const business: BusinessLite = await res.json();
    return { title: `Meus agendamentos · ${business.customization?.headline || business.name}` };
  } catch {
    return { title: 'Meus agendamentos' };
  }
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let business: BusinessLite;
  try {
    const res = await fetch(`${API_URL}/public/v1/${slug}`, { cache: 'no-store' });
    if (!res.ok) {
      // Fallback seguro para build estático se a API não responder
      business = {
        slug,
        name: 'Agendamento',
        customization: null,
      };
    } else {
      business = await res.json();
    }
  } catch {
    business = {
      slug,
      name: 'Agendamento',
      customization: null,
    };
  }

  const colors = business.customization?.theme?.colors || DEFAULT_COLORS;
  const buttonStyle = business.customization?.theme?.buttonStyle || 'rounded';
  const buttonRadius = buttonStyle === 'pill' ? '999px' : buttonStyle === 'square' ? '4px' : '8px';

  return (
    <AccountClient
      slug={slug}
      businessName={business.customization?.headline || business.name}
      logoUrl={business.logoUrl || business.customization?.theme?.logoUrl}
      colors={colors}
      font={business.customization?.theme?.font || 'inter'}
      buttonRadius={buttonRadius}
    />
  );
}