'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface Theme {
  palette: 'ocean' | 'sand' | 'forest' | 'mono' | 'custom';
  colors: { background: string; surface: string; primary: string; text: string };
  font: 'inter' | 'poppins' | 'playfair' | 'dmSans';
  background: { type: 'solid' | 'gradient' | 'image'; value: string };
  logoUrl?: string;
  coverUrl?: string;
  buttonStyle: 'rounded' | 'pill' | 'square';
  layout: 'list' | 'cards';
}

interface LinkItem {
  label: string;
  url: string;
}

interface Socials {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  tiktok?: string;
}

interface Customization {
  theme: Theme;
  headline?: string;
  about?: string;
  links: LinkItem[];
  socials: Socials;
}

const PALETTE_PRESETS: Record<Exclude<Theme['palette'], 'custom'>, Theme['colors']> = {
  ocean: { background: '#EFF6FF', surface: '#FFFFFF', primary: '#2563EB', text: '#1E293B' },
  sand: { background: '#FFFBEB', surface: '#FFFFFF', primary: '#D97706', text: '#1C1917' },
  forest: { background: '#F0FDF4', surface: '#FFFFFF', primary: '#16A34A', text: '#14532D' },
  mono: { background: '#F8FAFC', surface: '#FFFFFF', primary: '#475569', text: '#0F172A' },
};

const PALETTE_LABELS: Record<Theme['palette'], string> = {
  ocean: 'Oceano',
  sand: 'Areia',
  forest: 'Floresta',
  mono: 'Monocromático',
  custom: 'Personalizado',
};

const FONT_OPTIONS: { value: Theme['font']; label: string }[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'dmSans', label: 'DM Sans' },
];

const BUTTON_STYLES: { value: Theme['buttonStyle']; label: string }[] = [
  { value: 'rounded', label: 'Arredondado' },
  { value: 'pill', label: 'Pílula' },
  { value: 'square', label: 'Reto' },
];

const LAYOUT_OPTIONS: { value: Theme['layout']; label: string }[] = [
  { value: 'list', label: 'Lista' },
  { value: 'cards', label: 'Cards' },
];

function defaultCustomization(): Customization {
  return {
    theme: {
      palette: 'ocean',
      colors: { ...PALETTE_PRESETS.ocean },
      font: 'inter',
      background: { type: 'solid', value: PALETTE_PRESETS.ocean.background },
      buttonStyle: 'rounded',
      layout: 'list',
    },
    headline: '',
    about: '',
    links: [],
    socials: {},
  };
}

function buttonRadius(style: Theme['buttonStyle']): string {
  if (style === 'pill') return '9999px';
  if (style === 'square') return '0px';
  return '8px';
}

function fontFamily(font: Theme['font']): string {
  const map: Record<Theme['font'], string> = {
    inter: 'var(--font-inter)',
    poppins: 'var(--font-poppins)',
    playfair: 'var(--font-playfair)',
    dmSans: 'var(--font-dm-sans)',
  };
  return map[font] || 'var(--font-inter)';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CustomizationPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const businessName = user?.business?.name || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Customization>(defaultCustomization());
  const [uploadingCover, setUploadingCover] = useState(false);
  const [businessLogoUrl, setBusinessLogoUrl] = useState('');

  async function handleCoverUpload(file: File) {
    if (!token) return;
    setUploadingCover(true);
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
      updateTheme({ coverUrl: fullUrl, background: { type: 'image', value: fullUrl } });
    } catch {
      toast('Erro ao enviar imagem de capa', 'error');
    }
    setUploadingCover(false);
  }

  useEffect(() => {
    if (!token) return;
    loadCustomization();
  }, [token]);

  async function loadCustomization() {
    setLoading(true);
    try {
      const [result, biz] = await Promise.all([
        api<Customization | null>('/customization', { token: token! }),
        api<{ logoUrl?: string }>('/business', { token: token! }).catch(() => null),
      ]);
      if (result) setData(result);
      if (biz?.logoUrl) setBusinessLogoUrl(biz.logoUrl);
    } catch {
      // keep defaults
    }
    setLoading(false);
  }

  function updateTheme(patch: Partial<Theme>) {
    setData((prev) => ({
      ...prev,
      theme: { ...prev.theme, ...patch },
    }));
  }

  function selectPalette(palette: Theme['palette']) {
    if (palette === 'custom') {
      updateTheme({ palette: 'custom' });
    } else {
      const colors = { ...PALETTE_PRESETS[palette] };
      updateTheme({
        palette,
        colors,
        background: { type: 'solid', value: colors.background },
      });
    }
  }

  function updateColor(key: keyof Theme['colors'], value: string) {
    const newColors = { ...data.theme.colors, [key]: value };
    if (key === 'background') {
      updateTheme({
        colors: newColors,
        background: { ...data.theme.background, value },
      });
    } else {
      updateTheme({ colors: newColors });
    }
  }

  function updateLink(index: number, field: keyof LinkItem, value: string) {
    setData((prev) => {
      const links = [...prev.links];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, links };
    });
  }

  function addLink() {
    setData((prev) => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }));
  }

  function removeLink(index: number) {
    setData((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  }

  function updateSocial(key: keyof Socials, value: string) {
    setData((prev) => ({
      ...prev,
      socials: { ...prev.socials, [key]: value || undefined },
    }));
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const { theme, headline, about, links, socials } = data;
      await api('/customization', {
        method: 'PUT',
        token,
        body: JSON.stringify({ theme, headline, about, links, socials }),
      });
      toast('Personalização salva');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-strong mb-6">Personalização</h1>
        <div className="lg:grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse"
              />
            ))}
          </div>
          <div className="h-96 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse mt-6 lg:mt-0" />
        </div>
      </div>
    );
  }

  const { theme } = data;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong mb-6">Personalização</h1>

      <div className="lg:grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Identidade</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="cust-headline" className="block text-xs font-medium text-text-muted mb-1">
                  Título da página
                </label>
                <input
                  id="cust-headline"
                  value={data.headline ?? ''}
                  onChange={(e) => setData((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Ex.: Barbearia do Juninho"
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
              <div>
                <label htmlFor="cust-about" className="block text-xs font-medium text-text-muted mb-1">Sobre</label>
                <textarea
                  id="cust-about"
                  value={data.about ?? ''}
                  onChange={(e) => setData((prev) => ({ ...prev, about: e.target.value }))}
                  rows={3}
                  placeholder="Uma breve descrição do seu negócio"
                  className="w-full px-3 py-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle resize-y focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Imagem de capa</label>
                <div className="space-y-2">
                  {theme.coverUrl ? (
                    <div className="relative">
                      <img
                        src={theme.coverUrl}
                        alt="Capa"
                        className="w-full h-32 object-cover rounded-[var(--radius-sm)] border border-border-default"
                      />
                      <button
                        type="button"
                        onClick={() => updateTheme({ coverUrl: undefined, background: { type: 'solid', value: theme.colors.background } })}
                        className="absolute top-2 right-2 h-7 px-2 text-xs bg-surface-card/90 border border-border-default rounded-[var(--radius-sm)] text-danger-fg hover:bg-surface-card"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-strong rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-subtle transition-colors">
                      <span className="text-xs text-text-muted">
                        {uploadingCover ? 'Enviando...' : 'Clique para enviar uma imagem de capa'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverUpload(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Tema</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Paleta</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(PALETTE_LABELS) as Theme['palette'][]).map((p) => {
                    const isCustom = p === 'custom';
                    const previewColor = isCustom
                      ? theme.colors.primary
                      : PALETTE_PRESETS[p].primary;
                    const selected = theme.palette === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => selectPalette(p)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-sm)] border text-xs transition-colors ${
                          selected
                            ? 'border-primary-default ring-2 ring-primary-default/20'
                            : 'border-border-default hover:bg-surface-subtle'
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-full border border-border-default"
                          style={{ backgroundColor: previewColor }}
                        />
                        <span className="text-text-default truncate w-full text-center">
                          {PALETTE_LABELS[p]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="cust-font" className="block text-xs font-medium text-text-muted mb-1">Fonte</label>
                <select
                  id="cust-font"
                  value={theme.font}
                  onChange={(e) => updateTheme({ font: e.target.value as Theme['font'] })}
                  className="w-full max-w-xs h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Estilo de botão
                </label>
                <div className="flex gap-2">
                  {BUTTON_STYLES.map((bs) => (
                    <button
                      key={bs.value}
                      type="button"
                      onClick={() => updateTheme({ buttonStyle: bs.value })}
                      className={`h-9 px-4 text-sm border transition-colors ${
                        theme.buttonStyle === bs.value
                          ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text'
                          : 'border-border-strong text-text-default hover:bg-surface-subtle'
                      }`}
                      style={{ borderRadius: buttonRadius(bs.value) }}
                    >
                      {bs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Layout</label>
                <div className="flex gap-2">
                  {LAYOUT_OPTIONS.map((lo) => (
                    <button
                      key={lo.value}
                      type="button"
                      onClick={() => updateTheme({ layout: lo.value })}
                      className={`h-9 px-4 text-sm rounded-[var(--radius-sm)] border transition-colors ${
                        theme.layout === lo.value
                          ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text'
                          : 'border-border-strong text-text-default hover:bg-surface-subtle'
                      }`}
                    >
                      {lo.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {theme.palette === 'custom' && (
            <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
              <h2 className="text-base font-semibold text-text-strong mb-4">Cores</h2>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    ['background', 'Fundo'],
                    ['surface', 'Superfície'],
                    ['primary', 'Primária'],
                    ['text', 'Texto'],
                  ] as [keyof Theme['colors'], string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.colors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="w-9 h-9 p-0.5 border border-border-strong rounded-[var(--radius-sm)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.colors[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="flex-1 h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-strong">Links extras</h2>
              <button
                type="button"
                onClick={addLink}
                className="h-8 px-3 text-xs font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle"
              >
                Adicionar
              </button>
            </div>
            {data.links.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum link adicionado.</p>
            ) : (
              <div className="space-y-3">
                {data.links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        value={link.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder="Rótulo"
                        className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                      />
                      <input
                        value={link.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="mt-1 h-8 px-2 text-xs text-danger-fg hover:bg-danger-bg rounded-[var(--radius-sm)]"
                      aria-label="Remover link"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-base font-semibold text-text-strong mb-4">Redes sociais</h2>
            <div className="space-y-4">
              {(
                [
                  ['instagram', 'Instagram', '@seuusuario'],
                  ['whatsapp', 'WhatsApp', '5511999999999'],
                  ['facebook', 'Facebook', 'https://facebook.com/...'],
                  ['tiktok', 'TikTok', '@seuusuario'],
                ] as [keyof Socials, string, string][]
              ).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                  <input
                    value={data.socials[key] ?? ''}
                    onChange={(e) => updateSocial(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>

        <div className="mt-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-xs font-medium text-text-muted mb-3">Pré-visualização</h2>
            <div
              className="rounded-[var(--radius-md)] overflow-hidden"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                fontFamily: fontFamily(theme.font),
                minHeight: '400px',
              }}
            >
              {theme.coverUrl && (
                <div
                  className="w-full h-28 bg-cover bg-center"
                  style={{ backgroundImage: `url(${theme.coverUrl})` }}
                />
              )}
              <div className={`p-6 flex flex-col items-center text-center ${theme.coverUrl ? '-mt-10' : ''}`}>
                {businessLogoUrl ? (
                  <img
                    src={businessLogoUrl}
                    alt="Logo"
                    className="w-16 h-16 rounded-full mb-4 object-cover border-2"
                    style={{ borderColor: theme.colors.surface }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-white text-xl font-semibold"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    {(data.headline || businessName || 'N')[0].toUpperCase()}
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>
                  {data.headline || businessName || 'Seu negócio'}
                </h3>
                {data.about && (
                  <p className="text-sm mb-4 opacity-70" style={{ color: theme.colors.text }}>
                    {data.about}
                  </p>
                )}

                {(data.socials.instagram ||
                  data.socials.whatsapp ||
                  data.socials.facebook ||
                  data.socials.tiktok) && (
                  <div className="flex gap-3 mb-4">
                    {data.socials.instagram && (
                      <span style={{ color: theme.colors.text, opacity: 0.5 }} title="Instagram">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </span>
                    )}
                    {data.socials.whatsapp && (
                      <span style={{ color: theme.colors.text, opacity: 0.5 }} title="WhatsApp">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </span>
                    )}
                    {data.socials.facebook && (
                      <span style={{ color: theme.colors.text, opacity: 0.5 }} title="Facebook">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </span>
                    )}
                    {data.socials.tiktok && (
                      <span style={{ color: theme.colors.text, opacity: 0.5 }} title="TikTok">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="w-full max-w-xs py-3 px-4 text-sm font-semibold text-white shadow-sm"
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: buttonRadius(theme.buttonStyle),
                  }}
                >
                  Agendar horário
                </button>

                {data.links.length > 0 && (
                  <div className="w-full max-w-xs space-y-2 mt-3">
                    {data.links
                      .filter((l) => l.label)
                      .map((link, i) => (
                        <div
                          key={i}
                          className="w-full py-3 px-4 text-sm text-center font-medium border"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.text + '15',
                            color: theme.colors.text,
                            borderRadius: buttonRadius(theme.buttonStyle),
                          }}
                        >
                          {link.label}
                        </div>
                      ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
