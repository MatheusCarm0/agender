'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ToastProvider } from '@/components/toast';
import { api } from '@/lib/api';
import { AgenderLogo } from '@/components/logo';
import { FeedbackWidget } from '@/components/feedback-widget';
import { prefetchForRoute } from '@/lib/prefetch-cache';

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconScissors() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12L12 12" />
      <path d="M20 4L8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8L20 20" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconBan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93l14.14 14.14" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 100 4h4v-4z" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2H2v10l9.29 9.29a1 1 0 001.42 0l6.58-6.58a1 1 0 000-1.42z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function IconPalette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z" />
    </svg>
  );
}

function IconUserCog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="15" r="3" />
      <circle cx="9" cy="7" r="4" />
      <path d="M10 15H6a4 4 0 00-4 4v2" />
      <path d="M21.7 16.4l.3-.9" />
      <path d="M14.3 13.6l-.3.9" />
      <path d="M14.6 16.4l.9.3" />
      <path d="M21.1 13.3l-.9-.3" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType;
  roles: string[];
  /** Capacidade de plano exigida (espelho de api/src/plan/plan-limits.ts). */
  feature?: 'campaigns' | 'coupons' | 'memberships' | 'onlinePayments';
}

// Espelho da matriz comercial do backend (plan/plan-limits.ts) — trial vê tudo.
const PLAN_FEATURE_MATRIX: Record<string, string[]> = {
  campaigns: ['pro'],
  coupons: ['profissional', 'pro'],
  memberships: ['pro'],
  onlinePayments: ['profissional', 'pro'],
};

function planHasFeature(
  feature: NavItem['feature'],
  plan?: string,
  planStatus?: string,
): boolean {
  if (!feature) return true;
  if (planStatus === 'trialing') return true;
  return (PLAN_FEATURE_MATRIX[feature] ?? []).includes(plan ?? '');
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { href: '/admin', label: 'Agenda', icon: IconCalendar, roles: ['owner', 'admin', 'receptionist', 'professional'] },
      { href: '/admin/clientes', label: 'Clientes', icon: IconClipboard, roles: ['owner', 'admin', 'receptionist'] },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/admin/professionals', label: 'Profissionais', icon: IconUsers, roles: ['owner', 'admin', 'receptionist'] },
      { href: '/admin/services', label: 'Serviços', icon: IconScissors, roles: ['owner', 'admin', 'receptionist'] },
      { href: '/admin/working-hours', label: 'Horários', icon: IconClock, roles: ['owner', 'admin', 'receptionist'] },
      { href: '/admin/schedule-blocks', label: 'Bloqueios', icon: IconBan, roles: ['owner', 'admin', 'receptionist'] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/campanhas', label: 'Campanhas', icon: IconBell, roles: ['owner', 'admin'], feature: 'campaigns' },
      { href: '/admin/cupons', label: 'Cupons', icon: IconTag, roles: ['owner', 'admin', 'receptionist'], feature: 'coupons' },
      { href: '/admin/fidelidade', label: 'Fidelidade', icon: IconStar, roles: ['owner', 'admin', 'receptionist'], feature: 'memberships' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/admin/equipe', label: 'Equipe', icon: IconUserCog, roles: ['owner', 'admin'] },
      { href: '/admin/financeiro', label: 'Financeiro', icon: IconWallet, roles: ['owner', 'admin'] },
      { href: '/admin/recebimento', label: 'Recebimento', icon: IconWallet, roles: ['owner'], feature: 'onlinePayments' },
      { href: '/admin/plano', label: 'Plano', icon: IconStar, roles: ['owner', 'admin'] },
      { href: '/admin/notificacoes', label: 'Notificações', icon: IconBell, roles: ['owner', 'admin', 'receptionist'] },
      { href: '/admin/customization', label: 'Personalização', icon: IconPalette, roles: ['owner', 'admin', 'receptionist'] },
    ],
  },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  '/admin': 'Agenda',
  '/admin/clientes': 'Clientes',
  '/admin/professionals': 'Profissionais',
  '/admin/services': 'Serviços',
  '/admin/working-hours': 'Horários',
  '/admin/schedule-blocks': 'Bloqueios',
  '/admin/recurring-blocks': 'Bloqueios recorrentes',
  '/admin/equipe': 'Equipe',
  '/admin/campanhas': 'Campanhas',
  '/admin/cupons': 'Cupons',
  '/admin/fidelidade': 'Fidelidade',
  '/admin/financeiro': 'Financeiro',
  '/admin/notificacoes': 'Notificações',
  '/admin/customization': 'Personalização',
  '/admin/plano': 'Plano',
  '/admin/recebimento': 'Recebimento',
  '/admin/settings': 'Configurações',
};

function Breadcrumb({ pathname }: { pathname: string }) {
  if (pathname === '/admin') return null;
  const label = BREADCRUMB_LABELS[pathname];
  if (!label) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-text-muted">
      <Link href="/admin" className="hover:text-text-default transition-colors">Painel</Link>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
      <span className="text-text-strong font-medium">{label}</span>
    </nav>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-screen flex bg-surface-app">
      <aside className="hidden md:flex w-60 bg-surface-card border-r border-border-default flex-col">
        <div className="h-14 flex items-center gap-3 px-5 border-b border-border-default">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface-subtle animate-pulse" />
          <div className="h-4 w-28 bg-surface-subtle rounded animate-pulse" />
        </div>
        <nav className="flex-1 py-4 px-2 space-y-6">
          {[1, 2, 3].map((g) => (
            <div key={g} className="space-y-1">
              <div className="h-3 w-16 bg-surface-subtle rounded animate-pulse mx-3 mb-2" />
              {[1, 2].map((i) => (
                <div key={i} className="h-8 bg-surface-subtle rounded-[var(--radius-sm)] animate-pulse mx-1" />
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-surface-card border-b border-border-default flex items-center px-4">
          <div className="flex-1" />
          <div className="w-7 h-7 rounded-full bg-surface-subtle animate-pulse" />
        </header>
        <main className="flex-1 p-6">
          <div className="h-7 w-40 bg-surface-subtle rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState('');
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      setNavigatingTo(null);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !user.business.onboardingCompletedAt && user.business.onboardingStep && user.business.onboardingStep <= 6) {
      router.replace('/onboarding');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && user.business.planStatus === 'expired' && pathname !== '/admin/plano') {
      router.replace('/admin/plano');
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

  }, []);

    useEffect(() => {
    if (!token) return;
    loadBusinessLogo();
  }, [token]);

  async function loadBusinessLogo() {
    try {
      const biz = await api<{ logoUrl?: string }>('/business', {
        token: token!,
      });

      if (biz?.logoUrl) {
        setBusinessLogoUrl(biz.logoUrl);
      }
    } catch {
      // keep defaults
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (loading || !user) return <ShellSkeleton />;
    
  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-surface-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary-default focus:text-primary-fg focus:rounded-[var(--radius-sm)] focus:text-sm focus:font-medium">
        Pular para o conteúdo
      </a>

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
          <AgenderLogo />
        </div>
        <nav className="flex-1 py-3 px-2 overflow-y-auto" aria-label="Menu principal">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) =>
                item.roles.includes(user.role) &&
                planHasFeature(item.feature, user.business.plan, user.business.planStatus),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <span className="block px-3 mb-1 text-[11px] font-medium text-text-subtle uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setSidebarOpen(false);
                          if (!active) setNavigatingTo(item.href);
                        }}
                        onMouseEnter={() => token && prefetchForRoute(item.href, token)}
                        className={`relative flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors ${
                          active
                            ? 'bg-primary-tint-bg text-primary-tint-text'
                            : navigatingTo === item.href
                              ? 'bg-surface-subtle text-primary-default'
                              : 'text-text-default hover:bg-surface-subtle'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-default rounded-r" />
                        )}
                        <span className={active ? 'text-primary-tint-text' : navigatingTo === item.href ? 'text-primary-default' : 'text-text-muted'}>
                          {navigatingTo === item.href ? (
                            <svg width="18" height="18" viewBox="0 0 18 18" className="animate-spin" aria-hidden="true">
                              <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                              <path d="M9 2a7 7 0 016.93 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          ) : (
                            <Icon />
                          )}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border-default space-y-0.5">
          <FeedbackWidget />
          <Link
            href="/admin/settings"
            onClick={() => {
              setSidebarOpen(false);
              if (pathname !== '/admin/settings') setNavigatingTo('/admin/settings');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors ${
              pathname === '/admin/settings'
                ? 'bg-primary-tint-bg text-primary-tint-text'
                : navigatingTo === '/admin/settings'
                  ? 'bg-surface-subtle text-primary-default'
                  : 'text-text-muted hover:text-text-strong hover:bg-surface-subtle'
            }`}
          >
            <span className={pathname === '/admin/settings' ? 'text-primary-tint-text' : navigatingTo === '/admin/settings' ? 'text-primary-default' : ''}>
              {navigatingTo === '/admin/settings' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" className="animate-spin" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M9 2a7 7 0 016.93 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <IconSettings />
              )}
            </span>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex-1" />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-2 rounded-[var(--radius-sm)] hover:bg-surface-subtle transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm ring-1 ring-border-default">
                  {businessLogoUrl ? (
                    <img
                      src={businessLogoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[13px] font-medium tracking-wide"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-default) 0%, var(--color-primary-hover) 100%)',
                        color: 'var(--color-primary-fg)',
                      }}
                    >
                      {user.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
              </div>
              <span className="text-sm text-text-default hidden sm:block">{user.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-2)] py-1 z-30" role="menu">
                <div className="px-3 py-2 border-b border-border-default">
                  <p className="text-sm font-medium text-text-strong">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                  <p className="text-xs text-text-subtle mt-0.5 capitalize">{user.role}</p>
                </div>
                <Link
                  href="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-default hover:bg-surface-subtle transition-colors"
                  role="menuitem"
                >
                  <IconSettings />
                  Configurações
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-fg hover:bg-surface-subtle transition-colors"
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        {navigatingTo && (
          <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary-default/10">
            <div className="h-full bg-primary-default admin-nav-progress" />
          </div>
        )}
        <main id="main-content" className="flex-1 p-6">
          <Breadcrumb pathname={pathname} />
          {children}
          <style>{`
            @keyframes adminNavProgress {
              0% { width: 0; }
              20% { width: 30%; }
              50% { width: 60%; }
              80% { width: 85%; }
              100% { width: 95%; }
            }
            .admin-nav-progress {
              animation: adminNavProgress 2s ease-out forwards;
            }
            @media (prefers-reduced-motion: reduce) {
              .admin-nav-progress { animation: none; width: 95%; }
            }
          `}</style>
        </main>
      </div>
      </div>
    </ToastProvider>
  );
}
