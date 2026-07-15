import { notFound } from 'next/navigation';
import BookingClient from './booking-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
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

  return <BookingClient business={business} />;
}
