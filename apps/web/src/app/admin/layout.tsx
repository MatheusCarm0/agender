'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/admin', label: 'Agenda', icon: '📅' },
  { href: '/admin/professionals', label: 'Profissionais', icon: '👤' },
  { href: '/admin/services', label: 'Serviços', icon: '✂️' },
  { href: '/admin/working-hours', label: 'Horários', icon: '🕐' },
  { href: '/admin/schedule-blocks', label: 'Bloqueios', icon: '🚫' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex bg-surface-app">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-60 bg-surface-card border-r border-border-default flex flex-col transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 flex items-center px-5 border-b border-border-default">
          <span className="text-base font-semibold text-text-strong">Agenda</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors ${
                  active
                    ? 'bg-primary-tint-bg text-primary-tint-text border-l-2 border-primary-default'
                    : 'text-text-default hover:bg-surface-subtle'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border-default">
          <p className="text-xs text-text-muted truncate">{user.business.name}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-surface-card border-b border-border-default flex items-center px-4 gap-4 sticky top-0 z-20">
          <button
            className="md:hidden text-text-default"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-sm text-text-muted">{user.name}</span>
          <button
            onClick={logout}
            className="text-sm text-text-muted hover:text-text-strong"
          >
            Sair
          </button>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
