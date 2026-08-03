import { notFound } from 'next/navigation';
import BookingClient from './booking-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Customization {
  theme: {
    palette: string;
    colors: { background: string; surface: string; primary: string; text: string };
    font: string;
    background: { type: string; value: string; gradient?: { from: string; to: string; direction: string } };
    logoUrl?: string;
    coverUrl?: string;
    buttonStyle: string;
    layout: string;
    overlayOpacity?: number;
  };
  links: { label: string; url: string; icon?: string }[];
  socials: { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string };
  headline: string | null;
  about: string | null;
  welcomeMsg?: string | null;
  address?: { street?: string; city?: string; state?: string; zip?: string } | null;
  gallery?: string[];
  showHours?: boolean;
  faviconUrl?: string | null;
}

interface WorkingHour {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  logoUrl?: string;
  coverUrl?: string;
  acceptingBookings?: boolean;
  bookingPaymentPolicy?: 'none' | 'deposit' | 'full';
  depositPercent?: number | null;
  mpPublicKey?: string | null;
  customization: Customization | null;
  workingHours: WorkingHour[];
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/public/v1/${slug}`, { cache: 'no-store' });
    if (!res.ok) return {};
    const business: Business = await res.json();
    const title = business.customization?.headline || business.name;
    const description = business.customization?.about
      ? business.customization.about.slice(0, 160)
      : `Agende online com ${business.name}`;
    const icons = business.customization?.faviconUrl
      ? [{ url: business.customization.faviconUrl }]
      : undefined;
    const logoUrl = business.customization?.theme?.logoUrl || business.logoUrl;
    return {
      title,
      description,
      icons,
      openGraph: {
        title,
        description,
        ...(logoUrl ? { images: [{ url: logoUrl }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const preview = sp?.preview === '1';

  let business: Business;
  try {
    const res = await fetch(`${API_URL}/public/v1/${slug}`, {
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
        workingHours={business.workingHours}
        preview={preview}
      />
    </div>
  );
}
