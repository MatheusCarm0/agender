'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

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

export default function CustomizationPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<Customization>(defaultCustomization());

  useEffect(() => {
    if (!token) return;
    loadCustomization();
  }, [token]);

  async function loadCustomization() {
    setLoading(true);
    try {
      const result = await api<Customization | null>('/customization', { token: token! });
      if (result) {
        setData(result);
      }
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
    updateTheme({ colors: newColors });
    if (key === 'background') {
      updateTheme({
        colors: newColors,
        background: { ...data.theme.background, value },
      });
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
      await api('/customization', {
        method: 'PUT',
        token,
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handling could be added
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
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Titulo da pagina
                </label>
                <input
                  value={data.headline ?? ''}
                  onChange={(e) => setData((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Ex.: Barbearia do Juninho"
                  className="w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Sobre</label>
                <textarea
                  value={data.about ?? ''}
                  onChange={(e) => setData((prev) => ({ ...prev, about: e.target.value }))}
                  rows={3}
                  placeholder="Uma breve descricao do seu negocio"
                  className="w-full px-3 py-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle resize-y focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                />
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
                <label className="block text-xs font-medium text-text-muted mb-1">Fonte</label>
                <select
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
                  Estilo de botao
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
                    ['surface', 'Superficie'],
                    ['primary', 'Primaria'],
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
                        placeholder="Rotulo"
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
            {saved && (
              <span className="text-sm text-success-text">Alterações salvas</span>
            )}
          </div>
        </div>

        <div className="mt-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
          <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-elevation-1)]">
            <h2 className="text-xs font-medium text-text-muted mb-3">Pre-visualização</h2>
            <div
              className="rounded-[var(--radius-md)] overflow-hidden"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                fontFamily:
                  theme.font === 'inter'
                    ? "'Inter', sans-serif"
                    : theme.font === 'poppins'
                      ? "'Poppins', sans-serif"
                      : theme.font === 'playfair'
                        ? "'Playfair Display', serif"
                        : "'DM Sans', sans-serif",
                minHeight: '400px',
              }}
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-white text-xl font-semibold"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {(data.headline || 'N')[0].toUpperCase()}
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>
                  {data.headline || 'Seu negocio'}
                </h3>
                {data.about && (
                  <p className="text-sm mb-4 opacity-70" style={{ color: theme.colors.text }}>
                    {data.about}
                  </p>
                )}

                <button
                  type="button"
                  className="w-full max-w-xs py-2.5 px-4 text-sm font-medium text-white mb-3"
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: buttonRadius(theme.buttonStyle),
                  }}
                >
                  Agendar
                </button>

                {data.links.length > 0 && (
                  <div className="w-full max-w-xs space-y-2 mt-2">
                    {data.links
                      .filter((l) => l.label)
                      .map((link, i) => (
                        <div
                          key={i}
                          className="w-full py-2 px-4 text-sm text-center border"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.primary + '33',
                            color: theme.colors.text,
                            borderRadius: buttonRadius(theme.buttonStyle),
                          }}
                        >
                          {link.label}
                        </div>
                      ))}
                  </div>
                )}

                {(data.socials.instagram ||
                  data.socials.whatsapp ||
                  data.socials.facebook ||
                  data.socials.tiktok) && (
                  <div className="flex gap-3 mt-4">
                    {data.socials.instagram && (
                      <span className="text-xs opacity-60" style={{ color: theme.colors.text }}>
                        Instagram
                      </span>
                    )}
                    {data.socials.whatsapp && (
                      <span className="text-xs opacity-60" style={{ color: theme.colors.text }}>
                        WhatsApp
                      </span>
                    )}
                    {data.socials.facebook && (
                      <span className="text-xs opacity-60" style={{ color: theme.colors.text }}>
                        Facebook
                      </span>
                    )}
                    {data.socials.tiktok && (
                      <span className="text-xs opacity-60" style={{ color: theme.colors.text }}>
                        TikTok
                      </span>
                    )}
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
