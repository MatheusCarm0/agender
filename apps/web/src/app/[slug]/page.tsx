import { notFound } from 'next/navigation';
import BookingClient from './booking-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Customization {
  theme: {
    palette: string;
    colors: { background: string; surface: string; primary: string; text: string };
    font: string;
    background: { type: string; value: string };
    logoUrl?: string;
    coverUrl?: string;
    buttonStyle: string;
    layout: string;
  };
  links: { label: string; url: string; icon?: string }[];
  socials: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };
  headline: string | null;
  about: string | null;
}

interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  customization: Customization | null;
  professionals: {
    id: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    services: {
      id: string;
      name: string;
      durationMin: number;
      price: number;
    }[];
  }[];
}

const DEFAULT_COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0D9488',
  text: '#1C1917',
};

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let business: Business;
  try {
    const res = await fetch(`${API_URL}/public/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return notFound();
    business = await res.json();
  } catch {
    return notFound();
  }

  const colors = business.customization?.theme?.colors || DEFAULT_COLORS;
  const buttonStyle = business.customization?.theme?.buttonStyle || 'rounded';
  const buttonRadius = buttonStyle === 'pill' ? '999px' : buttonStyle === 'square' ? '4px' : '8px';

  const themeVars = {
    '--pub-bg': colors.background,
    '--pub-surface': colors.surface,
    '--pub-primary': colors.primary,
    '--pub-text': colors.text,
    '--pub-btn-radius': buttonRadius,
  } as React.CSSProperties;

  return (
    <div style={themeVars}>
      <BookingClient
        business={business}
        customization={business.customization}
      />
    </div>
  );
}
