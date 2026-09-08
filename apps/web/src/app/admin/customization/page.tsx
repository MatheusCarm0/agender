'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCached } from '@/lib/prefetch-cache';
import { useToast } from '@/components/toast';
import { contrastRatio } from '@/lib/color';

// Sincroniza a personalização (não salva) com os iframes de pré-visualização
// via postMessage same-origin. Cada iframe anuncia "ready" ao montar; nós
// respondemos com o estado atual e reemitimos a cada alteração.
function usePreviewBroadcast(payload: unknown) {
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const windowsRef = useRef<Set<Window>>(new Set());
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'agender:preview-ready' && e.source) {
        const w = e.source as Window;
        windowsRef.current.add(w);
        try { w.postMessage({ type: 'agender:preview', payload: payloadRef.current }, window.location.origin); } catch { /* noop */ }
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  useEffect(() => {
    windowsRef.current.forEach((w) => {
      try { w.postMessage({ type: 'agender:preview', payload }, window.location.origin); } catch { /* noop */ }
    });
  }, [payload]);
}

// Moldura de celular com a página pública real embutida em modo preview.
function PhonePreview({ slug, className, style }: { slug: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[2rem] border-[6px] border-neutral-800 bg-neutral-800 shadow-xl overflow-hidden flex flex-col ${className || ''}`} style={style}>
      <div className="h-6 bg-neutral-800 flex items-center justify-center shrink-0">
        <div className="w-20 h-3 bg-neutral-900 rounded-full" />
      </div>
      <iframe
        src={`/${slug}?preview=1`}
        title="Pré-visualização da página"
        className="flex-1 w-full bg-white"
        style={{ border: 'none' }}
      />
      <div className="h-5 bg-neutral-800 flex items-center justify-center shrink-0">
        <div className="w-24 h-1 bg-neutral-600 rounded-full" />
      </div>
    </div>
  );
}

// Leitura de contraste (WCAG) para o card de cores — advisory, não bloqueia.
function ContrastRow({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  const ratio = contrastRatio(fg, bg);
  const ok = ratio >= 4.5;
  const warn = !ok && ratio >= 3;
  const color = ok ? 'var(--color-success-fg)' : warn ? 'var(--color-warning-fg)' : 'var(--color-danger-fg)';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-medium" style={{ color }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {ratio.toFixed(1)}:1 · {ok ? 'bom' : warn ? 'baixo' : 'ruim'}
      </span>
    </div>
  );
}

interface Theme {
  palette: 'ocean' | 'sand' | 'forest' | 'mono' | 'sunset' | 'midnight' | 'elegant' | 'custom';
  colors: { background: string; surface: string; primary: string; text: string };
  font: string;
  background: { type: 'solid' | 'gradient' | 'image'; value: string; gradient?: { from: string; to: string; direction: string } };
  logoUrl?: string;
  coverUrl?: string;
  buttonStyle: 'rounded' | 'pill' | 'square';
  layout: 'list' | 'cards';
  overlayOpacity?: number;
  backgroundEffect?: 'none' | 'dots' | 'grid' | 'noise' | 'animated-gradient';
  containerStyle?: 'solid' | 'glass' | 'frosted';
}

interface Address { street?: string; city?: string; state?: string; zip?: string }
type BlockType = 'link' | 'heading' | 'divider' | 'text' | 'spacer';
interface LinkItem { label: string; url: string; icon?: string; thumbnailUrl?: string; style?: 'fill' | 'outline' | 'soft' | 'glass'; type?: BlockType }
interface Socials { instagram?: string; whatsapp?: string; facebook?: string; tiktok?: string }

interface Customization {
  theme: Theme;
  headline?: string;
  about?: string;
  welcomeMsg?: string;
  address?: Address;
  gallery?: string[];
  showHours?: boolean;
  faviconUrl?: string;
  links: LinkItem[];
  socials: Socials;
}

const PALETTE_PRESETS: Record<string, Theme['colors']> = {
  ocean: { background: '#EFF6FF', surface: '#FFFFFF', primary: '#2563EB', text: '#1E293B' },
  sand: { background: '#FFFBEB', surface: '#FFFFFF', primary: '#D97706', text: '#1C1917' },
  forest: { background: '#F0FDF4', surface: '#FFFFFF', primary: '#16A34A', text: '#14532D' },
  mono: { background: '#F8FAFC', surface: '#FFFFFF', primary: '#475569', text: '#0F172A' },
  sunset: { background: '#FFF7ED', surface: '#FFFFFF', primary: '#EA580C', text: '#431407' },
  midnight: { background: '#0F172A', surface: '#1E293B', primary: '#38BDF8', text: '#E2E8F0' },
  elegant: { background: '#1C1917', surface: '#292524', primary: '#D4A853', text: '#FAFAF9' },
};

const PALETTE_LABELS: Record<string, string> = {
  ocean: 'Oceano', sand: 'Areia', forest: 'Floresta', mono: 'Monocromático',
  sunset: 'Pôr do sol', midnight: 'Noturno', elegant: 'Elegante', custom: 'Personalizado',
};

const PALETTE_CATEGORIES: Record<string, string[]> = {
  'Claros': ['ocean', 'sand', 'forest', 'mono', 'sunset'],
  'Escuros': ['midnight', 'elegant'],
  'Livre': ['custom'],
};

const GRADIENT_PRESETS = [
  { name: 'Aurora', from: '#667EEA', to: '#764BA2', direction: 'to bottom right' },
  { name: 'Pôr do sol', from: '#F093FB', to: '#F5576C', direction: 'to bottom right' },
  { name: 'Oceano', from: '#4FACFE', to: '#00F2FE', direction: 'to bottom' },
  { name: 'Floresta', from: '#38EF7D', to: '#11998E', direction: 'to bottom right' },
  { name: 'Noturno', from: '#0F2027', to: '#2C5364', direction: 'to bottom' },
  { name: 'Pastel', from: '#FFECD2', to: '#FCB69F', direction: 'to bottom right' },
  { name: 'Lavanda', from: '#E6E9F0', to: '#EEF1F5', direction: 'to bottom' },
  { name: 'Neon', from: '#0F0C29', to: '#302B63', direction: 'to bottom right' },
];

const FONT_OPTIONS: { value: string; label: string; category: string }[] = [
  { value: 'inter', label: 'Inter', category: 'Moderna' },
  { value: 'poppins', label: 'Poppins', category: 'Moderna' },
  { value: 'dmSans', label: 'DM Sans', category: 'Moderna' },
  { value: 'montserrat', label: 'Montserrat', category: 'Moderna' },
  { value: 'spaceGrotesk', label: 'Space Grotesk', category: 'Moderna' },
  { value: 'nunito', label: 'Nunito', category: 'Descontraída' },
  { value: 'raleway', label: 'Raleway', category: 'Descontraída' },
  { value: 'playfair', label: 'Playfair Display', category: 'Elegante' },
  { value: 'lora', label: 'Lora', category: 'Elegante' },
  { value: 'cormorant', label: 'Cormorant Garamond', category: 'Elegante' },
];

const BUTTON_STYLES: { value: Theme['buttonStyle']; label: string }[] = [
  { value: 'rounded', label: 'Arredondado' },
  { value: 'pill', label: 'Pílula' },
  { value: 'square', label: 'Reto' },
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface VisualPreset {
  name: string;
  palette: Theme['palette'];
  colors: Theme['colors'];
  font: string;
  buttonStyle: Theme['buttonStyle'];
  backgroundEffect: Theme['backgroundEffect'];
  containerStyle: Theme['containerStyle'];
  background: Theme['background'];
}

const VISUAL_PRESETS: VisualPreset[] = [
  { name: 'Minimalista', palette: 'mono', colors: PALETTE_PRESETS.mono, font: 'inter', buttonStyle: 'rounded', backgroundEffect: 'none', containerStyle: 'solid', background: { type: 'solid', value: PALETTE_PRESETS.mono.background } },
  { name: 'Profissional', palette: 'ocean', colors: PALETTE_PRESETS.ocean, font: 'dmSans', buttonStyle: 'rounded', backgroundEffect: 'dots', containerStyle: 'solid', background: { type: 'solid', value: PALETTE_PRESETS.ocean.background } },
  { name: 'Elegante Escuro', palette: 'elegant', colors: PALETTE_PRESETS.elegant, font: 'playfair', buttonStyle: 'pill', backgroundEffect: 'none', containerStyle: 'glass', background: { type: 'solid', value: PALETTE_PRESETS.elegant.background } },
  { name: 'Neon Night', palette: 'midnight', colors: PALETTE_PRESETS.midnight, font: 'spaceGrotesk', buttonStyle: 'square', backgroundEffect: 'grid', containerStyle: 'glass', background: { type: 'gradient', value: '', gradient: { from: '#0F0C29', to: '#302B63', direction: 'to bottom right' } } },
  { name: 'Tropical', palette: 'sunset', colors: PALETTE_PRESETS.sunset, font: 'poppins', buttonStyle: 'pill', backgroundEffect: 'animated-gradient', containerStyle: 'frosted', background: { type: 'gradient', value: '', gradient: { from: '#F093FB', to: '#F5576C', direction: 'to bottom right' } } },
  { name: 'Natureza', palette: 'forest', colors: PALETTE_PRESETS.forest, font: 'nunito', buttonStyle: 'rounded', backgroundEffect: 'dots', containerStyle: 'solid', background: { type: 'solid', value: PALETTE_PRESETS.forest.background } },
  { name: 'Rústico', palette: 'sand', colors: PALETTE_PRESETS.sand, font: 'lora', buttonStyle: 'square', backgroundEffect: 'noise', containerStyle: 'solid', background: { type: 'solid', value: PALETTE_PRESETS.sand.background } },
  { name: 'Premium Glass', palette: 'midnight', colors: { ...PALETTE_PRESETS.midnight, primary: '#A78BFA' }, font: 'raleway', buttonStyle: 'pill', backgroundEffect: 'animated-gradient', containerStyle: 'frosted', background: { type: 'gradient', value: '', gradient: { from: '#1a1a2e', to: '#16213e', direction: 'to bottom' } } },
  { name: 'Clínico', palette: 'ocean', colors: { background: '#F0F9FF', surface: '#FFFFFF', primary: '#0EA5E9', text: '#0C4A6E' }, font: 'inter', buttonStyle: 'rounded', backgroundEffect: 'none', containerStyle: 'solid', background: { type: 'solid', value: '#F0F9FF' } },
  { name: 'Artístico', palette: 'custom', colors: { background: '#FDF2F8', surface: '#FFFFFF', primary: '#EC4899', text: '#831843' }, font: 'cormorant', buttonStyle: 'pill', backgroundEffect: 'dots', containerStyle: 'glass', background: { type: 'gradient', value: '', gradient: { from: '#FDF2F8', to: '#FCE7F3', direction: 'to bottom' } } },
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
    headline: '', about: '', welcomeMsg: '',
    address: {}, gallery: [], showHours: false, faviconUrl: '',
    links: [], socials: {},
  };
}

function buttonRadius(style: Theme['buttonStyle']): string {
  if (style === 'pill') return '9999px';
  if (style === 'square') return '0px';
  return '8px';
}

function fontFamily(font: string): string {
  const map: Record<string, string> = {
    inter: 'var(--font-inter)', poppins: 'var(--font-poppins)',
    playfair: 'var(--font-playfair)', dmSans: 'var(--font-dm-sans)',
    montserrat: 'var(--font-montserrat)', raleway: 'var(--font-raleway)',
    lora: 'var(--font-lora)', nunito: 'var(--font-nunito)',
    spaceGrotesk: 'var(--font-space-grotesk)', cormorant: 'var(--font-cormorant)',
  };
  return map[font] || 'var(--font-inter)';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// O backend aceita apenas estas extensões (upload.controller.ts), até 5 MB.
// SVG e ICO não são aceitos — manter o seletor alinhado evita uploads que falham.
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_FORMATS_HINT = 'JPG, PNG ou WebP · até 5 MB';
const inputClass = "w-full h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default";

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-elevation-1)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface WorkingHour { weekday: number; startTime: string; endTime: string }

type Tab = 'appearance' | 'content' | 'location' | 'links';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'appearance', label: 'Aparência', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { key: 'content', label: 'Conteúdo', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' },
  { key: 'location', label: 'Local e horários', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' },
  { key: 'links', label: 'Redes sociais', icon: 'M18 8a3 3 0 10-2.83-4M6 12a3 3 0 100-6 3 3 0 000 6zm12 6a3 3 0 10-2.83-4M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98' },
];

export default function CustomizationPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role !== 'receptionist';
  const businessName = user?.business?.name || '';
  const businessSlug = user?.business?.slug || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Customization>(defaultCustomization());
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [businessLogoUrl, setBusinessLogoUrl] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [showManualColors, setShowManualColors] = useState(false);
  const savedRef = useRef<string>('');
  const savedLogoRef = useRef<string>('');
  const [fetchingCep, setFetchingCep] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // Estado enviado à pré-visualização ao vivo (mesma forma que o /customization).
  const previewPayload = useMemo(() => ({
    customization: {
      theme: data.theme, headline: data.headline, about: data.about, welcomeMsg: data.welcomeMsg,
      address: data.address, gallery: data.gallery, showHours: data.showHours,
      links: data.links, socials: data.socials, faviconUrl: data.faviconUrl,
    },
    logoUrl: businessLogoUrl,
  }), [data, businessLogoUrl]);
  usePreviewBroadcast(previewPayload);

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { url } = await res.json();
    return `${API_URL}${url}`;
  }

  // Capa (faixa no topo) e imagem de fundo são coisas distintas: enviar a capa
  // não deve sequestrar o fundo da página (e vice-versa).
  async function handleCoverUpload(file: File) {
    if (!token) return;
    setUploadingCover(true);
    try {
      const fullUrl = await uploadFile(file);
      updateTheme({ coverUrl: fullUrl });
    } catch { toast('Erro ao enviar imagem de capa', 'error'); }
    setUploadingCover(false);
  }

  async function handleBackgroundImageUpload(file: File) {
    if (!token) return;
    setUploadingCover(true);
    try {
      const fullUrl = await uploadFile(file);
      updateTheme({ background: { type: 'image', value: fullUrl } });
    } catch { toast('Erro ao enviar imagem de fundo', 'error'); }
    setUploadingCover(false);
  }

  async function handleLogoUpload(file: File) {
    if (!token) return;
    setUploadingLogo(true);
    try {
      const fullUrl = await uploadFile(file);
      // Agrupado com o resto: persiste no "Salvar", junto da personalização.
      setBusinessLogoUrl(fullUrl);
      markDirty();
    } catch { toast('Erro ao enviar a logo', 'error'); }
    setUploadingLogo(false);
  }

  async function handleGalleryUpload(file: File) {
    if (!token) return;
    if ((data.gallery?.length || 0) >= 6) { toast('Máximo de 6 imagens na galeria', 'error'); return; }
    setUploadingGallery(true);
    try {
      const fullUrl = await uploadFile(file);
      setData((prev) => ({ ...prev, gallery: [...(prev.gallery || []), fullUrl] }));
      markDirty();
    } catch { toast('Erro ao enviar imagem', 'error'); }
    setUploadingGallery(false);
  }

  async function handleFaviconUpload(file: File) {
    if (!token) return;
    setUploadingFavicon(true);
    try {
      const fullUrl = await uploadFile(file);
      setData((prev) => ({ ...prev, faviconUrl: fullUrl }));
      markDirty();
    } catch { toast('Erro ao enviar favicon', 'error'); }
    setUploadingFavicon(false);
  }

  function removeGalleryImage(index: number) {
    setData((prev) => ({ ...prev, gallery: (prev.gallery || []).filter((_, i) => i !== index) }));
    markDirty();
  }

  useEffect(() => {
    if (!token) return;
    const cached = getCached<Customization>('/customization');
    if (cached) { setData({ ...defaultCustomization(), ...cached }); setLoading(false); }
    loadCustomization();
  }, [token]);

  async function loadCustomization() {
    setLoading(true);
    try {
      const [result, biz, hours] = await Promise.all([
        api<Customization | null>('/customization', { token: token! }),
        api<{ logoUrl?: string; slug?: string }>('/business', { token: token! }).catch(() => null),
        api<WorkingHour[]>('/working-hours', { token: token! }).catch(() => []),
      ]);
      if (result) setData({ ...defaultCustomization(), ...result });
      setBusinessLogoUrl(biz?.logoUrl || '');
      savedLogoRef.current = biz?.logoUrl || '';
      if (hours) setWorkingHours(hours);
      savedRef.current = JSON.stringify(result || defaultCustomization());
    } catch { /* keep defaults */ }
    setLoading(false);
  }

  function updateTheme(patch: Partial<Theme>) {
    setData((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }));
    markDirty();
  }

  function selectPalette(palette: string) {
    if (palette === 'custom') {
      updateTheme({ palette: 'custom' as Theme['palette'] });
    } else {
      const colors = { ...PALETTE_PRESETS[palette] };
      updateTheme({
        palette: palette as Theme['palette'],
        colors,
        background: { type: 'solid', value: colors.background },
      });
    }
  }

  function applyPreset(preset: VisualPreset) {
    updateTheme({
      palette: preset.palette,
      colors: { ...preset.colors },
      font: preset.font,
      buttonStyle: preset.buttonStyle,
      backgroundEffect: preset.backgroundEffect,
      containerStyle: preset.containerStyle,
      background: { ...preset.background },
    });
  }

  function updateColor(key: keyof Theme['colors'], value: string) {
    const newColors = { ...data.theme.colors, [key]: value };
    const bgPatch: Partial<Theme> = { colors: newColors, palette: 'custom' as Theme['palette'] };
    if (key === 'background') {
      bgPatch.background = { ...data.theme.background, value };
    }
    updateTheme(bgPatch);
  }


  function updateSocial(key: keyof Socials, value: string) {
    setData((prev) => ({ ...prev, socials: { ...prev.socials, [key]: value || undefined } }));
    markDirty();
  }

  function updateAddress(key: keyof Address, value: string) {
    setData((prev) => ({ ...prev, address: { ...prev.address, [key]: value || undefined } }));
    markDirty();
  }

  async function handleCepLookup(cep: string) {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const result = await res.json();
      if (!result.erro) {
        setData((prev) => ({
          ...prev,
          address: {
            ...prev.address,
            street: result.logradouro || prev.address?.street,
            city: result.localidade || prev.address?.city,
            state: result.uf || prev.address?.state,
            zip: cep,
          },
        }));
        markDirty();
      }
    } catch { /* ignore */ }
    setFetchingCep(false);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await api('/customization', {
        method: 'PUT', token,
        body: JSON.stringify({
          theme: data.theme, headline: data.headline, about: data.about,
          welcomeMsg: data.welcomeMsg, address: data.address, gallery: data.gallery,
          showHours: data.showHours, faviconUrl: data.faviconUrl,
          links: data.links, socials: data.socials,
        }),
      });
      // A logo vive no business; persiste junto quando mudou.
      if (businessLogoUrl !== savedLogoRef.current) {
        await api('/business', { method: 'PATCH', token, body: JSON.stringify({ logoUrl: businessLogoUrl }) });
        savedLogoRef.current = businessLogoUrl;
      }
      toast('Personalização salva');
      setIsDirty(false);
      savedRef.current = JSON.stringify(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
    setSaving(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/${businessSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-strong mb-6">Personalização</h1>
        <div className="lg:grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse mt-6 lg:mt-0" />
        </div>
      </div>
    );
  }

  const { theme } = data;
  const hoursByDay = workingHours.reduce<Record<number, WorkingHour[]>>((acc, wh) => {
    (acc[wh.weekday] ??= []).push(wh);
    return acc;
  }, {});

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${businessSlug}`;

  return (
    <>
    <div className="flex gap-6">
      {/* Coluna esquerda: formulário */}
      <div className="flex-1 min-w-0 lg:mr-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-strong">Personalização</h1>
          {isDirty && <span className="text-xs text-warning-fg font-medium bg-warning-bg px-2.5 py-1 rounded-[var(--radius-pill)]">Alterações não salvas</span>}
        </div>

        {/* Link da página pública */}
        {businessSlug && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-primary-tint-bg border border-primary-tint-border rounded-[var(--radius-md)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-default shrink-0"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
            <span className="text-sm text-primary-tint-text font-medium truncate flex-1">{publicUrl}</span>
            <button type="button" onClick={copyLink} className="h-7 px-3 text-xs font-medium bg-surface-card border border-border-strong rounded-[var(--radius-sm)] text-text-default hover:bg-surface-subtle shrink-0">
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <a href={`/${businessSlug}`} target="_blank" rel="noopener noreferrer" className="h-7 px-3 text-xs font-medium bg-surface-card border border-border-strong rounded-[var(--radius-sm)] text-text-default hover:bg-surface-subtle shrink-0 flex items-center gap-1">
              Abrir
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          </div>
        )}

        {/* Tabs de navegação */}
        <div className="flex gap-1 mb-6 border-b border-border-default overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-primary-default text-primary-default' : 'border-transparent text-text-muted hover:text-text-default hover:border-border-strong'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">

          {/* ======================== TAB: APARÊNCIA ======================== */}
          {activeTab === 'appearance' && (
            <>
              {/* TEMPLATES */}
              <SectionCard title="Templates visuais" action={<span className="text-[11px] text-text-subtle">Um clique aplica paleta, fonte, botão e efeitos</span>}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {VISUAL_PRESETS.map((preset) => {
                    const isActive = theme.palette === preset.palette && theme.font === preset.font && theme.buttonStyle === preset.buttonStyle;
                    const previewBg = preset.background.type === 'gradient' && preset.background.gradient
                      ? `linear-gradient(${preset.background.gradient.direction}, ${preset.background.gradient.from}, ${preset.background.gradient.to})`
                      : preset.colors.background;
                    return (
                      <button key={preset.name} type="button" onClick={() => applyPreset(preset)}
                        className={`group relative rounded-[var(--radius-md)] border-2 overflow-hidden transition-all hover:shadow-md ${isActive ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-border-default hover:border-border-strong'}`}>
                        <div className="h-20 p-2 flex flex-col justify-between" style={{ background: previewBg }}>
                          <div className="flex gap-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.primary }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.surface }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: preset.colors.text, opacity: 0.6 }} />
                            <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: preset.colors.text, opacity: 0.3 }} />
                          </div>
                          <div className="h-4 w-full rounded-sm" style={{
                            backgroundColor: preset.colors.primary,
                            borderRadius: preset.buttonStyle === 'pill' ? '9999px' : preset.buttonStyle === 'square' ? '0' : '4px',
                          }} />
                        </div>
                        <div className="px-2 py-1.5 bg-surface-card">
                          <p className="text-[11px] font-medium text-text-strong truncate">{preset.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* PALETA */}
              {/* CORES — paletas prontas + contraste + ajuste manual */}
              <SectionCard title="Cores">
                <div className="space-y-4">
                  {Object.entries(PALETTE_CATEGORIES).map(([category, palettes]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-text-muted mb-2">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {palettes.map((p) => {
                          const isCustom = p === 'custom';
                          const colors = isCustom ? theme.colors : PALETTE_PRESETS[p];
                          const selected = theme.palette === p;
                          return (
                            <button key={p} type="button" onClick={() => selectPalette(p)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs transition-colors ${selected ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-border-default hover:bg-surface-subtle'}`}>
                              <div className="flex gap-0.5">
                                <span className="w-4 h-4 rounded-full border border-border-default" style={{ backgroundColor: colors.background }} />
                                <span className="w-4 h-4 rounded-full border border-border-default" style={{ backgroundColor: colors.primary }} />
                                <span className="w-4 h-4 rounded-full border border-border-default" style={{ backgroundColor: colors.surface }} />
                                <span className="w-4 h-4 rounded-full border border-border-default" style={{ backgroundColor: colors.text }} />
                              </div>
                              <span className="text-text-default">{PALETTE_LABELS[p]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Leitura de contraste — guia, não bloqueia (a página curada já é validada ao salvar) */}
                  <div className="pt-3 border-t border-border-default space-y-1.5">
                    <ContrastRow label="Texto sobre o fundo" fg={theme.colors.text} bg={theme.colors.background} />
                    <ContrastRow label="Texto sobre a superfície" fg={theme.colors.text} bg={theme.colors.surface} />
                  </div>

                  {/* Ajuste manual (avançado) */}
                  <div className="pt-1">
                    <button type="button" onClick={() => setShowManualColors((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-default">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showManualColors ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6" /></svg>
                      Ajustar cores manualmente
                    </button>
                    {showManualColors && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {([['background', 'Fundo'], ['surface', 'Superfície'], ['primary', 'Primária'], ['text', 'Texto']] as [keyof Theme['colors'], string][]).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={theme.colors[key]} onChange={(e) => updateColor(key, e.target.value)} className="w-9 h-9 p-0.5 border border-border-strong rounded-[var(--radius-sm)] cursor-pointer" />
                              <input type="text" value={theme.colors[key]} onChange={(e) => updateColor(key, e.target.value)} className="flex-1 h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default" />
                            </div>
                          </div>
                        ))}
                        <p className="col-span-2 text-[11px] text-text-subtle">Ao alterar, a paleta muda para &quot;Personalizado&quot;.</p>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* FONTE */}
              <SectionCard title="Fonte">
                <div className="space-y-3">
                  {Object.entries(
                    FONT_OPTIONS.reduce<Record<string, typeof FONT_OPTIONS>>((acc, f) => {
                      (acc[f.category] ??= []).push(f);
                      return acc;
                    }, {})
                  ).map(([category, fonts]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-text-muted mb-2">{category}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {fonts.map((f) => (
                          <button key={f.value} type="button" onClick={() => updateTheme({ font: f.value })}
                            className={`text-left p-3 rounded-[var(--radius-sm)] border transition-colors ${theme.font === f.value ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-border-default hover:bg-surface-subtle'}`}>
                            <span className="block text-sm font-medium text-text-strong" style={{ fontFamily: fontFamily(f.value) }}>{f.label}</span>
                            <span className="block text-xs text-text-muted mt-0.5" style={{ fontFamily: fontFamily(f.value) }}>Agende seu horário</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* FUNDO */}
              <SectionCard title="Fundo da página">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {(['solid', 'gradient', 'image'] as const).map((type) => (
                      <button key={type} type="button"
                        onClick={() => {
                          if (type === 'solid') updateTheme({ background: { type: 'solid', value: theme.colors.background } });
                          else if (type === 'gradient') updateTheme({ background: { type: 'gradient', value: '', gradient: GRADIENT_PRESETS[0] } });
                          else updateTheme({ background: { type: 'image', value: theme.coverUrl || '' } });
                        }}
                        className={`h-9 px-4 text-sm rounded-[var(--radius-sm)] border transition-colors ${theme.background.type === type ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text' : 'border-border-strong text-text-default hover:bg-surface-subtle'}`}>
                        {type === 'solid' ? 'Cor sólida' : type === 'gradient' ? 'Gradiente' : 'Imagem'}
                      </button>
                    ))}
                  </div>

                  {theme.background.type === 'gradient' && (
                    <div className="space-y-3">
                      <p className="text-xs text-text-muted">Escolha um gradiente pronto ou personalize</p>
                      <div className="grid grid-cols-4 gap-2">
                        {GRADIENT_PRESETS.map((gp) => (
                          <button key={gp.name} type="button"
                            onClick={() => updateTheme({ background: { type: 'gradient', value: '', gradient: gp } })}
                            className={`h-12 rounded-[var(--radius-sm)] border transition-colors ${theme.background.gradient?.from === gp.from && theme.background.gradient?.to === gp.to ? 'ring-2 ring-primary-default border-primary-default' : 'border-border-default'}`}
                            style={{ background: `linear-gradient(${gp.direction}, ${gp.from}, ${gp.to})` }}
                            title={gp.name} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-muted mb-1">Cor inicial</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={theme.background.gradient?.from || '#667EEA'} onChange={(e) => updateTheme({ background: { ...theme.background, gradient: { ...theme.background.gradient!, from: e.target.value } } })} className="w-9 h-9 p-0.5 border border-border-strong rounded-[var(--radius-sm)] cursor-pointer" />
                            <input type="text" value={theme.background.gradient?.from || ''} onChange={(e) => updateTheme({ background: { ...theme.background, gradient: { ...theme.background.gradient!, from: e.target.value } } })} className="flex-1 h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-muted mb-1">Cor final</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={theme.background.gradient?.to || '#764BA2'} onChange={(e) => updateTheme({ background: { ...theme.background, gradient: { ...theme.background.gradient!, to: e.target.value } } })} className="w-9 h-9 p-0.5 border border-border-strong rounded-[var(--radius-sm)] cursor-pointer" />
                            <input type="text" value={theme.background.gradient?.to || ''} onChange={(e) => updateTheme({ background: { ...theme.background, gradient: { ...theme.background.gradient!, to: e.target.value } } })} className="flex-1 h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong font-[family-name:var(--font-geist-mono)] focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Direção</label>
                        <select value={theme.background.gradient?.direction || 'to bottom'} onChange={(e) => updateTheme({ background: { ...theme.background, gradient: { ...theme.background.gradient!, direction: e.target.value } } })} className="w-full max-w-xs h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default">
                          <option value="to bottom">↓ Para baixo</option>
                          <option value="to right">→ Para direita</option>
                          <option value="to bottom right">↘ Diagonal</option>
                          <option value="to top right">↗ Diagonal inversa</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {theme.background.type === 'image' && (
                    <div className="space-y-3">
                      {theme.background.value ? (
                        <>
                          <div className="relative">
                            <img src={theme.background.value} alt="Fundo" className="w-full h-32 object-cover rounded-[var(--radius-sm)] border border-border-default" />
                            {canEdit && <button type="button" onClick={() => updateTheme({ background: { type: 'solid', value: theme.colors.background } })} className="absolute top-2 right-2 h-7 px-2 text-xs bg-surface-card/90 border border-border-default rounded-[var(--radius-sm)] text-danger-fg hover:bg-surface-card">Remover</button>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1">Escurecimento do overlay ({Math.round((theme.overlayOpacity ?? 0) * 100)}%)</label>
                            <input type="range" min="0" max="0.7" step="0.05" value={theme.overlayOpacity ?? 0} onChange={(e) => updateTheme({ overlayOpacity: parseFloat(e.target.value) })} className="w-full accent-[var(--color-primary-default)]" />
                          </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-strong rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-subtle transition-colors">
                          <span className="text-xs text-text-muted">{uploadingCover ? 'Enviando...' : 'Clique para enviar uma imagem de fundo'}</span>
                          <span className="text-[11px] text-text-subtle mt-1">{IMAGE_FORMATS_HINT}</span>
                          <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBackgroundImageUpload(f); }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ESTILO DE BOTÃO + LAYOUT */}
              {/* ESTILO & EFEITOS — botão, layout, efeito de fundo e container num só lugar */}
              <SectionCard title="Estilo e efeitos">
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">Estilo de botão</label>
                    <div className="flex gap-2">
                      {BUTTON_STYLES.map((bs) => (
                        <button key={bs.value} type="button" onClick={() => updateTheme({ buttonStyle: bs.value })}
                          className={`h-9 px-4 text-sm text-white font-medium border transition-colors ${theme.buttonStyle === bs.value ? 'ring-2 ring-primary-default/30' : 'opacity-80 hover:opacity-100'}`}
                          style={{ backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, borderRadius: buttonRadius(bs.value) }}>{bs.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">Layout dos serviços</label>
                    <p className="text-[11px] text-text-subtle mb-2">Como os serviços aparecem na etapa de escolha do agendamento. Em <strong className="font-medium text-text-muted">Lista</strong>, um por linha com o preço à direita; em <strong className="font-medium text-text-muted">Cards</strong>, em grade de duas colunas com o preço abaixo do nome.</p>
                    <div className="flex gap-2">
                      {([{ value: 'list' as const, label: 'Lista' }, { value: 'cards' as const, label: 'Cards' }]).map((lo) => (
                        <button key={lo.value} type="button" onClick={() => updateTheme({ layout: lo.value })}
                          className={`h-9 px-4 text-sm rounded-[var(--radius-sm)] border transition-colors ${theme.layout === lo.value ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text' : 'border-border-strong text-text-default hover:bg-surface-subtle'}`}>{lo.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">Efeito de fundo</label>
                    <p className="text-[11px] text-text-subtle mb-2">Adiciona uma textura sutil sobre o fundo da página.</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'none' as const, label: 'Nenhum' },
                        { value: 'dots' as const, label: 'Pontos' },
                        { value: 'grid' as const, label: 'Grid' },
                        { value: 'noise' as const, label: 'Textura' },
                        { value: 'animated-gradient' as const, label: 'Gradiente animado' },
                      ]).map((fx) => (
                        <button key={fx.value} type="button" onClick={() => updateTheme({ backgroundEffect: fx.value })}
                          className={`h-9 px-4 text-sm rounded-[var(--radius-sm)] border transition-colors ${(theme.backgroundEffect || 'none') === fx.value ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text' : 'border-border-strong text-text-default hover:bg-surface-subtle'}`}>{fx.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">Estilo do container</label>
                    <p className="text-[11px] text-text-subtle mb-2">Aparência da área de conteúdo sobre o fundo.</p>
                    <div className="flex gap-2">
                      {([
                        { value: 'solid' as const, label: 'Sólido' },
                        { value: 'glass' as const, label: 'Glass' },
                        { value: 'frosted' as const, label: 'Frosted' },
                      ]).map((cs) => (
                        <button key={cs.value} type="button" onClick={() => updateTheme({ containerStyle: cs.value })}
                          className={`h-9 px-4 text-sm rounded-[var(--radius-sm)] border transition-colors ${(theme.containerStyle || 'solid') === cs.value ? 'border-primary-default bg-primary-tint-bg text-primary-tint-text' : 'border-border-strong text-text-default hover:bg-surface-subtle'}`}>{cs.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

            </>
          )}

          {/* ======================== TAB: CONTEÚDO ======================== */}
          {activeTab === 'content' && (
            <>
              <SectionCard title="Identidade">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-2">Logo do negócio</label>
                    <div className="flex items-center gap-4">
                      {businessLogoUrl ? (
                        <img src={businessLogoUrl} alt="Logo" className="w-14 h-14 rounded-full object-cover border border-border-default" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border-default flex items-center justify-center text-text-subtle text-lg font-medium">
                          {(data.headline || businessName || 'N')[0].toUpperCase()}
                        </div>
                      )}
                      {canEdit && (
                        <label className="h-8 px-3 text-xs font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle flex items-center cursor-pointer">
                          {uploadingLogo ? 'Enviando...' : businessLogoUrl ? 'Trocar logo' : 'Enviar logo'}
                          <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-text-subtle mt-1.5">Aparece na página de agendamento e no painel. {IMAGE_FORMATS_HINT}.</p>
                  </div>
                  <div>
                    <label htmlFor="cust-headline" className="block text-xs font-medium text-text-muted mb-1">Título da página</label>
                    <input id="cust-headline" value={data.headline ?? ''} onChange={(e) => { setData((prev) => ({ ...prev, headline: e.target.value })); markDirty(); }} placeholder="Ex.: Barbearia do Juninho" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="cust-about" className="block text-xs font-medium text-text-muted mb-1">Sobre</label>
                    <textarea id="cust-about" value={data.about ?? ''} onChange={(e) => { setData((prev) => ({ ...prev, about: e.target.value })); markDirty(); }} rows={3} placeholder="Uma breve descrição do seu negócio" className="w-full px-3 py-2 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong placeholder:text-text-subtle resize-y focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default" />
                  </div>
                  <div>
                    <label htmlFor="cust-welcome" className="block text-xs font-medium text-text-muted mb-1">Mensagem de boas-vindas</label>
                    <input id="cust-welcome" value={data.welcomeMsg ?? ''} onChange={(e) => { setData((prev) => ({ ...prev, welcomeMsg: e.target.value })); markDirty(); }} placeholder="Ex.: Agende online e ganhe 10% no primeiro corte!" className={inputClass} />
                    <p className="text-[11px] text-text-subtle mt-1">Aparece acima do botão de agendar na página pública.</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Favicon">
                <p className="text-xs text-text-muted mb-3">O ícone que aparece na aba do navegador. Use uma imagem quadrada (idealmente 64×64 ou maior).</p>
                <p className="text-[11px] text-text-subtle mb-3">{IMAGE_FORMATS_HINT}. Para um ícone quadrado nítido, prefira PNG.</p>
                <div className="flex items-center gap-4">
                  {data.faviconUrl ? (
                    <div className="relative">
                      <img src={data.faviconUrl} alt="Favicon" className="w-12 h-12 object-contain rounded-[var(--radius-sm)] border border-border-default bg-surface-subtle p-1" />
                      {canEdit && <button type="button" onClick={() => { setData((prev) => ({ ...prev, faviconUrl: '' })); markDirty(); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-danger-bg text-danger-fg rounded-full text-xs border border-border-default">×</button>}
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-border-strong rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-subtle transition-colors">
                      {uploadingFavicon ? (
                        <div className="w-4 h-4 border-2 border-primary-default border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-subtle"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      )}
                      <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); }} />
                    </label>
                  )}
                  <p className="text-[11px] text-text-subtle">{IMAGE_FORMATS_HINT}.</p>
                </div>
              </SectionCard>

              <SectionCard title="Imagem de capa">
                <p className="text-xs text-text-muted mb-3">Faixa no topo da página, atrás da logo. Não é usada quando o fundo da página é uma imagem. {IMAGE_FORMATS_HINT}.</p>
                {theme.coverUrl ? (
                  <div className="relative">
                    <img src={theme.coverUrl} alt="Capa" className="w-full h-32 object-cover rounded-[var(--radius-sm)] border border-border-default" />
                    {canEdit && <button type="button" onClick={() => updateTheme({ coverUrl: undefined })} className="absolute top-2 right-2 h-7 px-2 text-xs bg-surface-card/90 border border-border-default rounded-[var(--radius-sm)] text-danger-fg hover:bg-surface-card">Remover</button>}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-strong rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-subtle transition-colors">
                    <span className="text-xs text-text-muted">{uploadingCover ? 'Enviando...' : 'Clique para enviar uma imagem de capa'}</span>
                    <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                  </label>
                )}
              </SectionCard>

              <SectionCard title="Galeria de fotos" action={
                canEdit && (data.gallery?.length || 0) < 6 ? (
                  <label className="h-8 px-3 text-xs font-medium border border-border-strong text-text-default rounded-[var(--radius-sm)] hover:bg-surface-subtle flex items-center cursor-pointer">
                    {uploadingGallery ? 'Enviando...' : 'Adicionar'}
                    <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }} />
                  </label>
                ) : undefined
              }>
                <p className="text-base text-text-muted">Até 6 fotos do seu espaço ou trabalho. Aparecem na página pública.</p>
                <p className='text-xs text-text-subtle mb-3'>Formatos permitidos: {IMAGE_FORMATS_HINT}.</p>
                {(data.gallery?.length || 0) === 0 ? (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border-strong rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface-subtle transition-colors">
                    <span className="text-xs text-text-muted">{uploadingGallery ? 'Enviando...' : 'Clique para adicionar fotos'}</span>
                    <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }} />
                  </label>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {data.gallery!.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-[var(--radius-sm)] overflow-hidden border border-border-default group">
                        <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                        {canEdit && (
                          <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-surface-card/90 text-danger-fg rounded-full text-xs border border-border-default opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ======================== TAB: LOCAL E HORÁRIOS ======================== */}
          {activeTab === 'location' && (
            <>
              <SectionCard title="Endereço">
                <p className="text-xs text-text-muted mb-3">Exibido na página pública para clientes encontrarem você.</p>
                <div className="space-y-3">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-text-muted mb-1">CEP</label>
                    <div className="relative">
                      <input value={data.address?.zip ?? ''} onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
                        updateAddress('zip', v);
                        if (v.replace(/\D/g, '').length === 8) handleCepLookup(v);
                      }} placeholder="01234-567" className={inputClass} />
                      {fetchingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-default border-t-transparent rounded-full animate-spin" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Rua / Logradouro</label>
                    <input value={data.address?.street ?? ''} onChange={(e) => updateAddress('street', e.target.value)} placeholder="Rua das Flores, 123" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Cidade</label>
                      <input value={data.address?.city ?? ''} onChange={(e) => updateAddress('city', e.target.value)} placeholder="São Paulo" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Estado</label>
                      <input value={data.address?.state ?? ''} onChange={(e) => updateAddress('state', e.target.value)} placeholder="SP" className={inputClass} />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Horário de funcionamento">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.showHours ?? false} onChange={(e) => { setData((prev) => ({ ...prev, showHours: e.target.checked })); markDirty(); }} className="accent-[var(--color-primary-default)]" />
                    <span className="text-sm text-text-default">Exibir na página pública</span>
                  </label>
                </div>
                {workingHours.length === 0 ? (
                  <p className="text-xs text-text-muted">Nenhum horário cadastrado. Configure em <a href="/admin/working-hours" className="text-primary-default hover:text-primary-hover">Horários</a>.</p>
                ) : (
                  <div className="space-y-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const hours = hoursByDay[day];
                      return (
                        <div key={day} className="flex items-center gap-2 text-sm py-1">
                          <span className="w-10 text-text-muted font-medium">{DAY_NAMES[day]}</span>
                          {hours ? (
                            <span className="text-text-default">{hours.map((h) => `${h.startTime} - ${h.endTime}`).join(', ')}</span>
                          ) : (
                            <span className="text-text-subtle">Fechado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {/* ======================== TAB: REDES SOCIAIS ======================== */}
          {activeTab === 'links' && (
            <>
              <SectionCard title="Redes sociais">
                <div className="space-y-4">
                  {([
                    ['instagram', 'Instagram', '@seuusuario', 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'],
                    ['whatsapp', 'WhatsApp', '(11) 99999-9999', 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'],
                    ['facebook', 'Facebook', 'https://facebook.com/...', 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'],
                    ['tiktok', 'TikTok', '@seuusuario', 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'],
                  ] as [keyof Socials, string, string, string][]).map(([key, label, placeholder, iconPath]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={iconPath} /></svg>
                        </div>
                        <input value={data.socials[key] ?? ''} onChange={(e) => updateSocial(key, e.target.value)} placeholder={placeholder} className={`${inputClass} pl-8`} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}
        </div>

        </div>

      {/* ======================== PREVIEW ao vivo — iframe da página real ======================== */}
      <div className="hidden lg:flex fixed right-6 flex-col" style={{ top: 'calc(3.5rem + 0.75rem)', height: 'calc(100vh - 3.5rem - 1.5rem)', width: '380px' }}>
        <div className="flex items-center justify-between px-1 pb-2 shrink-0">
          <h2 className="text-xs font-medium text-text-muted">Pré-visualização ao vivo</h2>
          {businessSlug && (
            <a href={`/${businessSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-default hover:text-primary-hover flex items-center gap-1">
              Abrir em nova aba
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          )}
        </div>
        {businessSlug ? (
          <PhonePreview slug={businessSlug} className="flex-1 min-h-0" />
        ) : (
          <div className="flex-1 rounded-[2rem] border-[6px] border-neutral-800 bg-surface-subtle flex items-center justify-center text-center px-6">
            <p className="text-xs text-text-muted">Defina o link da sua página para ver a pré-visualização.</p>
          </div>
        )}
      </div>

      {/* Botão flutuante de prévia no mobile (o painel fixo só existe no desktop) */}
      {businessSlug && (
        <button type="button" onClick={() => setMobilePreviewOpen(true)}
          className={`lg:hidden fixed right-4 z-30 h-12 pl-4 pr-5 flex items-center gap-2 rounded-[var(--radius-pill)] bg-primary-default text-primary-fg text-sm font-medium shadow-[var(--shadow-elevation-2)] active:bg-primary-active transition-[bottom] ${isDirty ? 'bottom-[4.75rem]' : 'bottom-5'}`}
          aria-label="Ver pré-visualização da página">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
          Ver prévia
        </button>
      )}

      {/* Sheet de prévia no mobile — mesmo iframe da página real, em tela cheia */}
      {mobilePreviewOpen && businessSlug && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-black/45" onClick={() => setMobilePreviewOpen(false)}>
          <div className="mt-auto bg-surface-app rounded-t-[var(--radius-lg)] p-4 h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-text-strong">Pré-visualização ao vivo</h2>
              <div className="flex items-center gap-3">
                <a href={`/${businessSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-default hover:text-primary-hover">Abrir</a>
                <button type="button" onClick={() => setMobilePreviewOpen(false)} aria-label="Fechar pré-visualização"
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-subtle">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <PhonePreview slug={businessSlug} className="flex-1 min-h-0 w-full max-w-[400px] mx-auto" />
          </div>
        </div>
      )}
        </div>

    {canEdit && isDirty && (
        <div className="fixed bottom-0 left-0 right-0 lg:right-[404px] z-40 bg-surface-card border-t border-border-default shadow-[var(--shadow-elevation-2)]">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-text-muted">Você tem alterações não salvas</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { loadCustomization(); setIsDirty(false); }} className="h-9 px-4 text-sm font-medium border border-border-strong rounded-[var(--radius-sm)] text-text-default hover:bg-surface-subtle">Descartar</button>
              <button type="button" onClick={handleSave} disabled={saving} className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
