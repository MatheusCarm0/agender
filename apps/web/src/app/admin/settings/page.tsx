'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useTheme } from '@/lib/theme-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [businessForm, setBusinessForm] = useState({ name: '', logoUrl: '', subdomain: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toggleTheme, theme } = useTheme();

  useEffect(() => {
    if (!user || !token) return;
    setProfileForm({ name: user.name, email: user.email });
    api<{
      name: string;
      logoUrl?: string;
      subdomain?: string;
    }>('/business', { token })
      .then((b) => {
        setBusinessForm({ name: b.name, logoUrl: b.logoUrl || '', subdomain: b.subdomain || '' });
      })
      .catch(() => setBusinessForm({ name: user.business.name, logoUrl: '', subdomain: '' }));
  }, [user, token]);

  async function handleLogoUpload(file: File) {
    if (!token) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      const fullUrl = `${API_URL}${url}`;
      setBusinessForm((f) => ({ ...f, logoUrl: fullUrl }));
      await api('/business', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ logoUrl: fullUrl }),
      });
    } catch {
      toast('Erro ao enviar logo', 'error');
    }
    setUploadingLogo(false);
  }

  async function handleRemoveLogo() {
    if (!token) return;
    setBusinessForm((f) => ({ ...f, logoUrl: '' }));
    try {
      await api('/business', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ logoUrl: null }),
      });
      toast('Logo removida');
    } catch {
      toast('Erro ao remover logo', 'error');
    }
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
      toast('Perfil salvo');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar perfil', 'error');
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
        body: JSON.stringify({ name: businessForm.name }),
      });
      toast('Negócio salvo');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar negócio', 'error');
    }
    setSavingBusiness(false);
  }

  async function handleSaveSubdomain(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingSubdomain(true);
    try {
      await api('/business', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ subdomain: businessForm.subdomain || null }),
      });
      toast('Subdomínio salvo');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar subdomínio', 'error');
    }
    setSavingSubdomain(false);
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
              <label htmlFor="settings-name" className="block text-xs font-medium text-text-muted mb-1">Nome</label>
              <input
                id="settings-name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="block text-xs font-medium text-text-muted mb-1">E-mail</label>
              <input
                id="settings-email"
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
            </div>
          </form>
        </section>

        {isOwner && (
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Negócio</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Logo do negócio</label>
                <div className="flex items-center gap-4">
                  {businessForm.logoUrl ? (
                    <img
                      src={businessForm.logoUrl}
                      alt="Logo"
                      className="w-20 h-20 rounded-full object-cover border border-border-default"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium tracking-wide shadow-sm ring-1 ring-border-default"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-default) 0%, var(--color-primary-hover) 100%)',
                        color: 'var(--color-primary-fg)',
                      }}
                    >
                      {(user?.business.name || 'N')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="h-9 px-4 text-sm font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle cursor-pointer flex items-center gap-2 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {uploadingLogo ? 'Enviando...' : 'Enviar foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file);
                        }}
                      />
                    </label>
                    {businessForm.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-xs text-danger-fg hover:underline text-left"
                      >
                        Remover logo
                      </button>
                    )}
                    <p className="text-xs text-text-subtle">JPG, PNG ou WebP. Máx. 5 MB.</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSaveBusiness} className="space-y-4">
                <div>
                  <label htmlFor="settings-biz-name" className="block text-xs font-medium text-text-muted mb-1">Nome do negócio</label>
                  <input
                    id="settings-biz-name"
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
                </div>
              </form>
            </div>
          </section>
        )}

        {isOwner && (
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-1">Cobrança no agendamento</h2>
            <p className="text-sm text-text-muted">
              A cobrança online no agendamento chega em breve, junto com o recebimento. Por
              enquanto os clientes agendam sem pagar antes.
            </p>
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

        {isOwner && (
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Subdomínio</h2>
            <p className="text-sm text-text-muted mb-3">
              Defina um subdomínio personalizado para sua página de agendamento.
            </p>
            <form onSubmit={handleSaveSubdomain} className="space-y-3">
              <div className="flex items-center gap-1">
                <input
                  id="settings-subdomain"
                  value={businessForm.subdomain}
                  onChange={(e) => setBusinessForm((f) => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="meu-negocio"
                  className="w-48 h-9 px-3 text-sm border border-border-strong rounded-l-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] focus:border-primary-default focus:outline-none"
                />
                <span className="h-9 px-3 flex items-center text-sm text-text-muted bg-surface-subtle border border-l-0 border-border-strong rounded-r-[var(--radius-sm)]">
                  .app.com
                </span>
              </div>
              <button
                type="submit"
                disabled={savingSubdomain}
                className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
              >
                {savingSubdomain ? 'Salvando...' : 'Salvar subdomínio'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
