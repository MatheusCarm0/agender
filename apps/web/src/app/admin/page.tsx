import { Suspense } from 'react';
import { getAuthToken, serverApi } from '@/lib/server-api';
import AgendaClient from './agenda-client';

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  price: string;
  professional: { name: string };
  service: { name: string };
  client: { name: string; phone: string };
}

async function AgendaData() {
  try {
    const token = await getAuthToken();
    if (!token) return <AgendaClient initialAppointments={null} />;
    const appointments = await serverApi<Appointment[]>('/appointments');
    return <AgendaClient initialAppointments={appointments} />;
  } catch {
    return <AgendaClient initialAppointments={null} />;
  }
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="mb-6">
          <div className="h-7 w-32 bg-surface-subtle rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-subtle rounded animate-pulse mt-2" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <AgendaData />
    </Suspense>
  );
}
