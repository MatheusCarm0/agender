'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, token } = useAuth();

  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [businessForm, setBusinessForm] = useState({ name: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email });
      setBusinessForm({ name: user.business.name });
    }
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('admin_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      await api('/auth/profile', {
        method: 'PATCH',
        token,
        body: JSON.stringify(profileForm),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      // handled by api layer
    }
    setSavingProfile(false);
  }

  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingBusiness(true);
    try {
      await api('/business', {
        method: 'PATCH',
        token,
        body: JSON.stringify(businessForm),
      });
      setBusinessSaved(true);
      setTimeout(() => setBusinessSaved(false), 2000);
    } catch {
      // handled by api layer
    }
    setSavingBusiness(false);
  }

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-strong mb-6">Configurações</h1>

      <div className="space-y-6">
        <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Perfil</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Nome</label>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
              >
                {savingProfile ? 'Salvando...' : 'Salvar perfil'}
              </button>
              {profileSaved && (
                <span className="text-sm text-success-text">Salvo</span>
              )}
            </div>
          </form>
        </section>

        {isOwner && (
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Negócio</h2>
            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Nome do negócio</label>
                <input
                  value={businessForm.name}
                  onChange={(e) => setBusinessForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Slug</label>
                <p className="text-sm text-text-muted font-[family-name:var(--font-geist-mono)]">
                  /{user?.business.slug}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingBusiness}
                  className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
                >
                  {savingBusiness ? 'Salvando...' : 'Salvar negócio'}
                </button>
                {businessSaved && (
                  <span className="text-sm text-success-text">Salvo</span>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">Aparência</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-strong">Tema escuro</p>
              <p className="text-xs text-text-muted mt-0.5">Alterar a aparência do painel</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary-default' : 'bg-border-strong'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                  theme === 'dark' ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </section>

        {isOwner && (
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Página pública</h2>
            <p className="text-sm text-text-muted mb-3">
              Sua página de agendamento está acessível em:
            </p>
            <a
              href={`/${user?.business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-default hover:underline font-[family-name:var(--font-geist-mono)]"
            >
              /{user?.business.slug}
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
