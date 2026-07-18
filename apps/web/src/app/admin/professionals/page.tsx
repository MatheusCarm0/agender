'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
}

export default function ProfessionalsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    const data = await api<Professional[]>('/professionals', { token: token! });
    setProfessionals(data);
    if (!silent) setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', bio: '' });
    setAvatarPreview(null);
    setAvatarFile(null);
    setShowForm(true);
  }

  function openEdit(p: Professional) {
    setEditingId(p.id);
    setForm({ name: p.name, bio: p.bio || '' });
    setAvatarPreview(p.avatarUrl);
    setAvatarFile(null);
    setShowForm(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      toast('Apenas JPG, PNG e WebP são permitidos', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Imagem muito grande (máx. 5 MB)', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile || !token) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      return `${API_URL}${url}`;
    } catch {
      toast('Erro ao enviar imagem', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        ...(form.bio ? { bio: form.bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      };

      if (editingId) {
        await api(`/professionals/${editingId}`, {
          method: 'PATCH',
          token: token!,
          body: JSON.stringify(payload),
        });
        toast('Profissional atualizado', 'success');
      } else {
        await api('/professionals', {
          method: 'POST',
          token: token!,
          body: JSON.stringify(payload),
        });
        toast('Profissional criado com sucesso', 'success');
      }
      setShowForm(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      await loadData(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar', 'error');
    }
    setSaving(false);
  }

  async function toggleActive(p: Professional) {
    try {
      await api(`/professionals/${p.id}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify({ active: !p.active }),
      });
      toast(p.active ? 'Profissional desativado' : 'Profissional ativado');
      await loadData(true);
    } catch {
      toast('Erro ao alterar status', 'error');
    }
  }

  function removeAvatar() {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const [search, setSearch] = useState('');

  const filteredProfessionals = professionals.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Profissionais</h1>
          <p className="text-xs text-text-muted mt-1">Gerencie sua equipe de profissionais.</p>
        </div>
        <button
          onClick={openCreate}
          className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover active:bg-primary-active"
        >
          Adicionar
        </button>
      </div>

      {professionals.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar profissional..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-default/20"
          />
        </div>
      )}

      {showForm && (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] p-6 mb-6 shadow-[var(--shadow-elevation-1)]">
          <h2 className="text-base font-semibold text-text-strong mb-4">
            {editingId ? 'Editar profissional' : 'Novo profissional'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-surface-subtle border-2 border-dashed border-border-strong flex items-center justify-center cursor-pointer hover:border-primary-default overflow-hidden"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-subtle">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {avatarPreview ? (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-[11px] text-danger-fg hover:underline"
                  >
                    Remover foto
                  </button>
                ) : (
                  <span className="text-[11px] text-text-subtle">Clique para enviar</span>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label htmlFor="prof-name" className="block text-xs font-medium text-text-muted mb-1">Nome</label>
                  <input
                    id="prof-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    minLength={2}
                    className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                  />
                </div>
                <div>
                  <label htmlFor="prof-bio" className="block text-xs font-medium text-text-muted mb-1">Bio (opcional)</label>
                  <input
                    id="prof-bio"
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Ex: Especialista em cortes modernos"
                    className="w-full max-w-sm h-9 px-3 text-sm border border-border-strong rounded-[var(--radius-sm)] bg-surface-card text-text-strong focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover disabled:opacity-50"
              >
                {uploading ? 'Enviando foto...' : saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setAvatarFile(null); setAvatarPreview(null); }}
                className="h-9 px-4 border border-border-strong text-text-default text-sm rounded-[var(--radius-sm)] hover:bg-surface-subtle"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-surface-subtle rounded-[var(--radius-md)] animate-pulse" />
          ))}
        </div>
      ) : filteredProfessionals.length === 0 && search ? (
        <div className="text-center py-12">
          <p className="text-text-muted">Nenhum profissional encontrado para "{search}".</p>
        </div>
      ) : professionals.length === 0 ? (
        <div className="text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-text-subtle">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          <p className="text-text-muted">Nenhum profissional cadastrado.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 h-9 px-4 bg-primary-default text-primary-fg text-sm font-medium rounded-[var(--radius-sm)] hover:bg-primary-hover"
          >
            Cadastrar primeiro profissional
          </button>
        </div>
      ) : (
        <div className="bg-surface-card border border-border-default rounded-[var(--radius-md)] shadow-[var(--shadow-elevation-1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Profissional</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Bio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfessionals.map((p) => (
                <tr key={p.id} className="border-b border-border-default hover:bg-surface-subtle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-text-muted">
                            {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-text-strong">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{p.bio || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.active
                        ? 'bg-success-bg text-success-text'
                        : 'bg-surface-subtle text-text-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-success-fg' : 'bg-text-subtle'}`} />
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-2 py-1 text-primary-default hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="text-xs px-2 py-1 text-text-muted hover:bg-surface-subtle rounded-[var(--radius-sm)]"
                      >
                        {p.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
