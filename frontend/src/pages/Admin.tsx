import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wifi,
  LogOut,
  Palette,
  FormInput,
  Users,
  Eye,
  Copy,
  Check,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Menu,
  X,
  ToggleLeft,
  ToggleRight,
  Lock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminConfig {
  id: number;
  business_name: string;
  logo_url: string;
  background_url: string;
  primary_color: string;
  welcome_title: string;
  welcome_subtitle: string;
  button_text: string;
  terms_text: string;
  require_name: number;
  require_email: number;
  require_phone: number;
  require_gender: number;
  require_birthdate: number;
  redirect_url: string;
}

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birthdate: string;
  ip_address: string;
  created_at: string;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('admin_token'); }
function setToken(t: string) { localStorage.setItem('admin_token', t); }
function clearToken() { localStorage.removeItem('admin_token'); }

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/admin';
  }
  return res;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 ${
        checked ? 'bg-emerald-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        onChange(data.url);
        toast.success('Imagen subida correctamente');
      } else {
        toast.error(data.error || 'Error al subir imagen');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUrlSet = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      toast.success('URL configurada');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-white/10">
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white" />
            <span className="text-xs">Subiendo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload className="w-6 h-6" />
            <span className="text-xs">Arrastrá o hacé clic para subir</span>
            <span className="text-xs text-gray-500">JPG, PNG, WebP, GIF — Máx 5MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="O pegar URL de imagen..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30"
          onKeyDown={(e) => e.key === 'Enter' && handleUrlSet()}
        />
        <button
          type="button"
          onClick={handleUrlSet}
          className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-white text-sm transition-colors"
        >
          Usar URL
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Apariencia ──────────────────────────────────────────────────────────
function AppearanceTab({ config, onChange }: { config: AdminConfig; onChange: (c: AdminConfig) => void }) {
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AdminConfig, value: string | number) => {
    onChange({ ...config, [field]: value });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          business_name: config.business_name,
          logo_url: config.logo_url,
          background_url: config.background_url,
          primary_color: config.primary_color,
          welcome_title: config.welcome_title,
          welcome_subtitle: config.welcome_subtitle,
          button_text: config.button_text,
          terms_text: config.terms_text,
          redirect_url: config.redirect_url,
        }),
      });
      if (res.ok) {
        toast.success('Apariencia guardada');
      } else {
        toast.error('Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Apariencia del Portal</h2>
        <p className="text-gray-400 text-sm">Personaliza cómo se ve tu portal de WiFi</p>
      </div>

      {/* Images */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Imágenes</h3>
        <ImageUploadField
          label="Logo del negocio"
          value={config.logo_url}
          onChange={(url) => set('logo_url', url)}
        />
        <ImageUploadField
          label="Imagen de fondo"
          value={config.background_url}
          onChange={(url) => set('background_url', url)}
        />
      </div>

      {/* Branding */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Marca</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre del negocio</label>
            <input
              type="text"
              value={config.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              className={inputClass}
              placeholder="Mi Negocio"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Color primario</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.primary_color}
                onChange={(e) => set('primary_color', e.target.value)}
                className="w-12 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={config.primary_color}
                onChange={(e) => set('primary_color', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="#e53e3e"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Texts */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Textos</h3>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Título principal</label>
          <input
            type="text"
            value={config.welcome_title}
            onChange={(e) => set('welcome_title', e.target.value)}
            className={inputClass}
            placeholder="Bienvenido"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Subtítulo</label>
          <input
            type="text"
            value={config.welcome_subtitle}
            onChange={(e) => set('welcome_subtitle', e.target.value)}
            className={inputClass}
            placeholder="Conéctate gratis al WiFi"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Texto del botón</label>
          <input
            type="text"
            value={config.button_text}
            onChange={(e) => set('button_text', e.target.value)}
            className={inputClass}
            placeholder="Acceder al WiFi"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            URL de redirección (después del acceso)
          </label>
          <input
            type="url"
            value={config.redirect_url}
            onChange={(e) => set('redirect_url', e.target.value)}
            className={inputClass}
            placeholder="https://tu-sitio.com"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Términos y condiciones</label>
          <textarea
            value={config.terms_text}
            onChange={(e) => set('terms_text', e.target.value)}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Texto de términos y condiciones..."
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        style={{ background: config.primary_color || '#e53e3e' }}
      >
        {saving ? 'Guardando...' : 'Guardar apariencia'}
      </button>
    </div>
  );
}

// ─── Tab: Form Fields ─────────────────────────────────────────────────────────
function FieldsTab({ config, onChange }: { config: AdminConfig; onChange: (c: AdminConfig) => void }) {
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          require_name: config.require_name,
          require_email: config.require_email,
          require_phone: config.require_phone,
          require_gender: config.require_gender,
          require_birthdate: config.require_birthdate,
        }),
      });
      if (res.ok) {
        toast.success('Campos guardados');
      } else {
        toast.error('Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      key: 'require_name' as keyof AdminConfig,
      label: 'Nombre y Apellido',
      description: 'Campos de nombre y apellido',
      locked: true,
    },
    {
      key: 'require_email' as keyof AdminConfig,
      label: 'Correo electrónico',
      description: 'Campo de email',
      locked: false,
    },
    {
      key: 'require_phone' as keyof AdminConfig,
      label: 'Teléfono / Celular',
      description: 'Campo de teléfono',
      locked: false,
    },
    {
      key: 'require_gender' as keyof AdminConfig,
      label: 'Género',
      description: 'Selección de género',
      locked: false,
    },
    {
      key: 'require_birthdate' as keyof AdminConfig,
      label: 'Fecha de Nacimiento',
      description: 'Selector de día / mes / año',
      locked: false,
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Campos del Formulario</h2>
        <p className="text-gray-400 text-sm">
          Elegí qué información recolectar de tus usuarios
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10 overflow-hidden">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              {f.locked ? (
                <Lock className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 flex-shrink-0" />
              )}
              <div>
                <p className="text-white text-sm font-medium">{f.label}</p>
                <p className="text-gray-500 text-xs">{f.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {f.locked && (
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  Requerido
                </span>
              )}
              <Toggle
                checked={Boolean(config[f.key])}
                onChange={
                  f.locked
                    ? () => {}
                    : (v) => onChange({ ...config, [f.key]: v ? 1 : 0 })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Vista previa de campos
        </h3>
        <div className="space-y-2">
          {config.require_name ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3">
                <span className="text-gray-500 text-xs">Nombre</span>
              </div>
              <div className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3">
                <span className="text-gray-500 text-xs">Apellido</span>
              </div>
            </div>
          ) : null}
          {config.require_email ? (
            <div className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3">
              <span className="text-gray-500 text-xs">Correo electrónico</span>
            </div>
          ) : null}
          {config.require_phone ? (
            <div className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3">
              <span className="text-gray-500 text-xs">Teléfono</span>
            </div>
          ) : null}
          {config.require_gender ? (
            <div className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3">
              <span className="text-gray-500 text-xs">Género ▾</span>
            </div>
          ) : null}
          {config.require_birthdate ? (
            <div className="grid grid-cols-3 gap-2">
              {['Día ▾', 'Mes ▾', 'Año ▾'].map((p) => (
                <div
                  key={p}
                  className="h-10 bg-white/10 rounded-lg border border-white/10 flex items-center px-3"
                >
                  <span className="text-gray-500 text-xs">{p}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div
            className="h-12 rounded-xl flex items-center justify-center"
            style={{ background: config.primary_color || '#e53e3e' }}
          >
            <span className="text-white text-sm font-semibold">
              {config.button_text || 'Acceder al WiFi'}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        style={{ background: config.primary_color || '#e53e3e' }}
      >
        {saving ? 'Guardando...' : 'Guardar campos'}
      </button>
    </div>
  );
}

// ─── Tab: Leads ───────────────────────────────────────────────────────────────
function LeadsTab({ primaryColor }: { primaryColor: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchLeads = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/leads?page=${p}`);
      const data = await res.json() as { leads: Lead[]; total: number; page: number; totalPages: number };
      setLeads(data.leads);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const deleteLead = async (id: number) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    setDeleting(id);
    try {
      const res = await authFetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Registro eliminado');
        fetchLeads(page);
      }
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const exportCSV = () => {
    if (leads.length === 0) { toast.error('No hay datos para exportar'); return; }
    const headers = ['ID', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Género', 'Fecha Nac.', 'IP', 'Fecha Registro'];
    const rows = leads.map((l) => [
      l.id, l.first_name, l.last_name, l.email, l.phone, l.gender, l.birthdate, l.ip_address,
      new Date(l.created_at).toLocaleString('es-PY'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV descargado');
  };

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Leads / Registros</h2>
          <p className="text-gray-400 text-sm">{total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay registros aún</p>
          <p className="text-sm mt-1">Los usuarios que accedan al portal aparecerán aquí</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  {['Nombre', 'Email', 'Teléfono', 'Género', 'Fecha de Registro', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 text-white font-medium">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{lead.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.gender || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmt(lead.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        disabled={deleting === lead.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        {deleting === lead.id ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border border-white/20 border-t-white" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLeads(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchLeads(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Preview ─────────────────────────────────────────────────────────────
function PreviewTab() {
  const portalUrl = `${window.location.origin}/portal`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Vista Previa</h2>
          <p className="text-gray-400 text-sm">Así verán tus usuarios el portal</p>
        </div>
        <a
          href="/portal"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir en nueva pestaña
        </a>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Browser chrome */}
        <div className="bg-gray-800 border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 bg-gray-700/50 rounded-md px-3 py-1 text-gray-400 text-xs truncate">
            {portalUrl}
          </div>
        </div>
        <iframe
          src="/portal"
          title="Portal Preview"
          className="w-full border-0"
          style={{ height: '600px' }}
        />
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Ingresá la contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (data.token) {
        setToken(data.token);
        toast.success('Bienvenido al panel admin');
        onLogin();
      } else {
        setError(data.error || 'Contraseña incorrecta');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
          <p className="text-gray-400 text-sm mt-1">WiFrii Manager</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-all"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
          <p className="text-center text-gray-600 text-xs">
            Contraseña por defecto: <span className="text-gray-400 font-mono">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin component ─────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(!!getToken());
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const portalUrl = `${window.location.origin}/portal`;

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await authFetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json() as AdminConfig;
        setConfig(data);
      }
    } catch {
      toast.error('Error al cargar configuración');
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchConfig();
  }, [authed, fetchConfig]);

  const copyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('URL copiada al portapapeles');
  };

  const logout = () => {
    clearToken();
    setAuthed(false);
    navigate('/admin');
  };

  if (!authed) {
    return <LoginScreen onLogin={() => { setAuthed(true); navigate('/admin/apariencia'); }} />;
  }

  const navItems = [
    { to: '/admin/apariencia', icon: <Palette className="w-4 h-4" />, label: 'Apariencia' },
    { to: '/admin/campos', icon: <FormInput className="w-4 h-4" />, label: 'Campos' },
    { to: '/admin/leads', icon: <Users className="w-4 h-4" />, label: 'Leads' },
    { to: '/admin/preview', icon: <Eye className="w-4 h-4" />, label: 'Vista Previa' },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/15 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/8'
    }`;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-white/10 z-30 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">WiFrii</p>
              <p className="text-gray-500 text-xs">Panel Admin</p>
            </div>
          </div>
        </div>

        {/* Portal URL pill */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-gray-500 text-xs mb-1.5">Tu portal</p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <span className="text-gray-300 text-xs truncate flex-1">{portalUrl}</span>
            <button onClick={copyUrl} className="flex-shrink-0 text-gray-400 hover:text-white transition-colors">
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white text-sm">WiFrii</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          {loadingConfig || !config ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
            </div>
          ) : (
            <Routes>
              <Route index element={<Navigate to="apariencia" replace />} />
              <Route
                path="apariencia"
                element={<AppearanceTab config={config} onChange={setConfig} />}
              />
              <Route
                path="campos"
                element={<FieldsTab config={config} onChange={setConfig} />}
              />
              <Route
                path="leads"
                element={<LeadsTab primaryColor={config.primary_color} />}
              />
              <Route path="preview" element={<PreviewTab />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
