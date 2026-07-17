'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ToastProvider } from '@/components/toast';

const NAV_ITEMS = [
  { href: '/admin', label: 'Agenda', icon: '📅', roles: ['owner', 'admin', 'professional'] },
  { href: '/admin/professionals', label: 'Profissionais', icon: '👤', roles: ['owner', 'admin'] },
  { href: '/admin/services', label: 'Serviços', icon: '✂️', roles: ['owner', 'admin'] },
  { href: '/admin/working-hours', label: 'Horários', icon: '🕐', roles: ['owner', 'admin', 'professional'] },
  { href: '/admin/schedule-blocks', label: 'Bloqueios', icon: '🚫', roles: ['owner', 'admin'] },
  { href: '/admin/recurring-blocks', label: 'Bloqueios recorrentes', icon: '🔁', roles: ['owner', 'admin'] },
  { href: '/admin/clientes', label: 'Clientes', icon: '📋', roles: ['owner', 'admin'] },
  { href: '/admin/financeiro', label: 'Financeiro', icon: '💰', roles: ['owner', 'admin', 'professional'] },
  { href: '/admin/customization', label: 'Personalização', icon: '🎨', roles: ['owner', 'admin'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (loading || !user) return null;

  const initials = user.business.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <ToastProvider>
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
        <div className="h-14 flex items-center gap-3 px-5 border-b border-border-default">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-primary-default text-primary-fg flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <span className="text-sm font-semibold text-text-strong truncate">{user.business.name}</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors ${
                  active
                    ? 'bg-primary-tint-bg text-primary-tint-text'
                    : 'text-text-default hover:bg-surface-subtle'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-default rounded-r" />
                )}
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border-default">
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-text-muted hover:text-text-strong hover:bg-surface-subtle rounded-[var(--radius-sm)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Configurações
          </Link>
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-2 rounded-[var(--radius-sm)] hover:bg-surface-subtle transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary-default text-primary-fg flex items-center justify-center text-xs font-semibold">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-text-default hidden sm:block">{user.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-2)] py-1 z-30">
                <div className="px-3 py-2 border-b border-border-default">
                  <p className="text-sm font-medium text-text-strong">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                  <p className="text-xs text-text-subtle mt-0.5 capitalize">{user.role}</p>
                </div>
                <Link
                  href="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-default hover:bg-surface-subtle transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Configurações
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-fg hover:bg-surface-subtle transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      </div>
    </ToastProvider>
  );
}
