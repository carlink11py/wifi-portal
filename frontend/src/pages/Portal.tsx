import React, { useEffect, useState } from 'react';
import { Wifi, Smartphone, Tablet, Laptop } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PortalConfig {
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

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birthdate_day: string;
  birthdate_month: string;
  birthdate_year: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;
type DeviceType = 'phone' | 'tablet' | 'desktop';

// ─── Device detection ─────────────────────────────────────────────────────────
function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // iPad on iOS 13+ identifies as "Macintosh" but has touch
  const isIpadOS = /Macintosh/i.test(ua) && hasTouch;
  const isTabletUA = /iPad|Tablet|Kindle|Silk|PlayBook/i.test(ua);
  const isPhoneUA = /Android(?!.*Tablet)|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua);

  if (isTabletUA || isIpadOS || (hasTouch && width >= 640 && width < 1024)) {
    return 'tablet';
  }
  if (isPhoneUA || (hasTouch && width < 640)) {
    return 'phone';
  }
  return 'desktop';
}

function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(() => detectDevice());

  useEffect(() => {
    const handler = () => setDevice(detectDevice());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return device;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function buildYears() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 5; y >= current - 100; y--) years.push(y);
  return years;
}
function buildDays() {
  return Array.from({ length: 31 }, (_, i) => i + 1);
}

const DEVICE_META: Record<DeviceType, { icon: React.ReactNode; label: string }> = {
  phone:   { icon: <Smartphone className="w-3 h-3" />, label: 'Teléfono' },
  tablet:  { icon: <Tablet    className="w-3 h-3" />, label: 'Tablet'   },
  desktop: { icon: <Laptop    className="w-3 h-3" />, label: 'Notebook' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DeviceBadge({ device }: { device: DeviceType }) {
  const meta = DEVICE_META[device];
  return (
    <span className="inline-flex items-center p-1.5 rounded-full bg-white/10 text-white/50">
      {meta.icon}
    </span>
  );
}

function SuccessScreen({
  config,
  countdown,
  primaryColor,
}: {
  config: PortalConfig | null;
  countdown: number;
  primaryColor: string;
}) {
  return (
    <div className="text-center py-6 animate-fade-in">
      <div className="flex justify-center mb-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: `${primaryColor}22`, border: `3px solid ${primaryColor}` }}
        >
          <svg
            className="w-12 h-12"
            viewBox="0 0 52 52"
            fill="none"
            stroke={primaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle className="checkmark-circle" cx="26" cy="26" r="25" />
            <path className="checkmark-check" d="M14 26l8 8 16-16" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">¡Conexión exitosa!</h2>
      <p className="text-white/70 mb-6">
        {config?.redirect_url
          ? `Serás redirigido en ${countdown} segundo${countdown !== 1 ? 's' : ''}...`
          : 'Ya podés navegar libremente'}
      </p>
      {config?.redirect_url ? (
        <a
          href={config.redirect_url}
          className="inline-block px-8 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: primaryColor }}
        >
          Ir ahora
        </a>
      ) : (
        <div className="inline-flex items-center gap-2 text-white/60">
          <Wifi className="w-5 h-5" style={{ color: primaryColor }} />
          <span className="font-medium">WiFi activo</span>
        </div>
      )}
    </div>
  );
}

interface FormProps {
  config: PortalConfig | null;
  form: FormData;
  errors: FormErrors;
  submitting: boolean;
  set: (field: keyof FormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onShowTerms: () => void;
  primaryColor: string;
  inputClass: (error?: string) => string;
  selectClass: (error?: string) => string;
  twoColNames?: boolean; // phone: stacked, tablet/desktop: side-by-side
}

function PortalForm({
  config, form, errors, submitting,
  set, onSubmit, onShowTerms,
  primaryColor, inputClass, selectClass, twoColNames = true,
}: FormProps) {
  const years = buildYears();
  const days = buildDays();

  return (
    <form className="portal-form space-y-4" onSubmit={onSubmit} noValidate>
      {config?.require_name ? (
        twoColNames ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input type="text" placeholder="Nombre" value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                className={inputClass(errors.first_name)} autoComplete="given-name" />
              {errors.first_name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.first_name}</p>}
            </div>
            <div>
              <input type="text" placeholder="Apellido" value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                className={inputClass(errors.last_name)} autoComplete="family-name" />
              {errors.last_name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.last_name}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <input type="text" placeholder="Nombre" value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                className={inputClass(errors.first_name)} autoComplete="given-name" />
              {errors.first_name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.first_name}</p>}
            </div>
            <div>
              <input type="text" placeholder="Apellido" value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                className={inputClass(errors.last_name)} autoComplete="family-name" />
              {errors.last_name && <p className="text-red-400 text-xs mt-1 ml-1">{errors.last_name}</p>}
            </div>
          </div>
        )
      ) : null}

      {config?.require_email ? (
        <div>
          <input type="email" placeholder="Correo electrónico" value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass(errors.email)} autoComplete="email" inputMode="email" />
          {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
        </div>
      ) : null}

      {config?.require_phone ? (
        <div>
          <input type="tel" placeholder="Teléfono / Celular" value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass(errors.phone)} autoComplete="tel" inputMode="tel" />
          {errors.phone && <p className="text-red-400 text-xs mt-1 ml-1">{errors.phone}</p>}
        </div>
      ) : null}

      {config?.require_gender ? (
        <div className="relative">
          <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
            className={selectClass(errors.gender)}>
            <option value="" className="bg-gray-900">Género</option>
            <option value="Masculino" className="bg-gray-900">Masculino</option>
            <option value="Femenino" className="bg-gray-900">Femenino</option>
            <option value="Prefiero no decir" className="bg-gray-900">Prefiero no decir</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">▾</div>
          {errors.gender && <p className="text-red-400 text-xs mt-1 ml-1">{errors.gender}</p>}
        </div>
      ) : null}

      {config?.require_birthdate ? (
        <div>
          <p className="text-white/50 text-xs mb-2 ml-1">Fecha de nacimiento</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: form.birthdate_day,   field: 'birthdate_day'   as keyof FormData, placeholder: 'Día',
                opts: days.map(d => ({ v: String(d), l: String(d) })) },
              { val: form.birthdate_month, field: 'birthdate_month' as keyof FormData, placeholder: 'Mes',
                opts: MONTHS.map((m, i) => ({ v: String(i + 1), l: m })) },
              { val: form.birthdate_year,  field: 'birthdate_year'  as keyof FormData, placeholder: 'Año',
                opts: years.map(y => ({ v: String(y), l: String(y) })) },
            ].map(({ val, field, placeholder, opts }) => (
              <div key={field} className="relative">
                <select value={val} onChange={(e) => set(field, e.target.value)}
                  className={selectClass(errors.birthdate_day)}>
                  <option value="" className="bg-gray-900">{placeholder}</option>
                  {opts.map(o => <option key={o.v} value={o.v} className="bg-gray-900">{o.l}</option>)}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">▾</div>
              </div>
            ))}
          </div>
          {errors.birthdate_day && <p className="text-red-400 text-xs mt-1 ml-1">{errors.birthdate_day}</p>}
        </div>
      ) : null}

      <button type="submit" disabled={submitting}
        className="w-full py-4 rounded-xl font-bold text-white text-base tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-lg"
        style={{ background: primaryColor }}>
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Conectando...
          </span>
        ) : (config?.button_text || 'Acceder al WiFi')}
      </button>

      <p className="text-center text-white/40 text-xs mt-3">
        Al acceder usted acepta los{' '}
        <button type="button"
          className="underline text-white/60 hover:text-white transition-colors"
          onClick={onShowTerms}>
          Términos y Condiciones
        </button>
      </p>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Portal() {
  const device = useDeviceType();
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showTerms, setShowTerms] = useState(false);
  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', email: '', phone: '',
    gender: '', birthdate_day: '', birthdate_month: '', birthdate_year: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: PortalConfig) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) { if (config?.redirect_url) window.location.href = config.redirect_url; return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, config]);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (config?.require_name) {
      if (!form.first_name.trim()) e.first_name = 'El nombre es requerido';
      if (!form.last_name.trim()) e.last_name = 'El apellido es requerido';
    }
    if (config?.require_email) {
      if (!form.email.trim()) e.email = 'El email es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    }
    if (config?.require_phone && !form.phone.trim()) e.phone = 'El teléfono es requerido';
    if (config?.require_gender && !form.gender) e.gender = 'Por favor seleccione una opción';
    if (config?.require_birthdate && (!form.birthdate_day || !form.birthdate_month || !form.birthdate_year))
      e.birthdate_day = 'La fecha de nacimiento es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const birthdate = form.birthdate_day && form.birthdate_month && form.birthdate_year
      ? `${form.birthdate_year}-${form.birthdate_month.padStart(2, '0')}-${form.birthdate_day.padStart(2, '0')}`
      : '';
    try {
      const res = await fetch('/api/portal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: form.first_name, last_name: form.last_name,
          email: form.email, phone: form.phone, gender: form.gender, birthdate }),
      });
      if (res.ok) { setSuccess(true); setCountdown(3); }
    } catch {
      setSuccess(true); setCountdown(3);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  const primaryColor = config?.primary_color || '#e53e3e';

  const bgStyle: React.CSSProperties = config?.background_url
    ? { backgroundImage: `url(${config.background_url})`, backgroundSize: 'cover',
        backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : {};

  const fallbackBg = { background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1a0a2e 100%)' };

  const inputClass = (error?: string) =>
    `w-full px-4 py-3 rounded-xl bg-white/10 border ${error ? 'border-red-400' : 'border-white/20'
    } text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/15 transition-all text-sm`;

  const selectClass = (error?: string) =>
    `w-full px-4 py-3 rounded-xl bg-white/10 border ${error ? 'border-red-400' : 'border-white/20'
    } text-white focus:outline-none focus:border-white/60 transition-all text-sm appearance-none`;

  const formProps: FormProps = {
    config, form, errors, submitting, primaryColor,
    set: setField, onSubmit: handleSubmit, onShowTerms: () => setShowTerms(true),
    inputClass, selectClass,
  };

  const LogoBlock = ({ center = true, size = 'md' }: { center?: boolean; size?: 'sm' | 'md' | 'lg' }) => {
    const iconSizes = { sm: 'w-10 h-10', md: 'w-16 h-16', lg: 'w-20 h-20' };
    const wifiSizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-10 h-10' };
    const imgMaxH = { sm: '80px', md: '120px', lg: '140px' };
    return (
      <div className={`portal-logo flex flex-col ${center ? 'items-center' : 'items-start'} mb-4`}>
        {config?.logo_url ? (
          <img src={config.logo_url} alt={config?.business_name}
            className="object-contain drop-shadow-lg mb-2"
            style={{ maxHeight: imgMaxH[size], maxWidth: '100%' }} />
        ) : (
          <div className={`${iconSizes[size]} rounded-2xl flex items-center justify-center mb-2`}
            style={{ background: `${primaryColor}33` }}>
            <Wifi className={wifiSizes[size]} style={{ color: primaryColor }} />
          </div>
        )}
        {config?.business_name && (
          <p className={`text-white/60 text-xs font-medium tracking-widest uppercase ${center ? 'text-center' : ''}`}>
            {config.business_name}
          </p>
        )}
      </div>
    );
  };

  // ── PHONE layout ─────────────────────────────────────────────────────────────
  if (device === 'phone') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-6 relative overflow-hidden"
        style={config?.background_url ? bgStyle : fallbackBg}>
        <div className="absolute inset-0 bg-black/60" />
        {!config?.background_url && (
          <>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
          </>
        )}

        <div className="portal-card relative z-10 w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: primaryColor }} />

            <div className="px-6 py-6">
              {/* Badge */}
              <div className="flex justify-end mb-3">
                <DeviceBadge device="phone" />
              </div>

              {/* Logo centrado */}
              <div className="flex flex-col items-center mb-5">
                {config?.logo_url ? (
                  <img src={config.logo_url} alt={config?.business_name}
                    className="max-h-[80px] max-w-full object-contain drop-shadow-lg mb-2" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
                    style={{ background: `${primaryColor}33` }}>
                    <Wifi className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                )}
                {config?.business_name && (
                  <p className="text-white/50 text-xs font-medium tracking-widest uppercase text-center">
                    {config.business_name}
                  </p>
                )}
              </div>

              {/* Heading centrado */}
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {config?.welcome_title || 'Bienvenido'}
                </h1>
                <p className="text-white/60 text-sm">
                  {config?.welcome_subtitle || 'Conéctate gratis al WiFi'}
                </p>
              </div>

              {success ? (
                <SuccessScreen config={config} countdown={countdown} primaryColor={primaryColor} />
              ) : (
                <PortalForm {...formProps} twoColNames={true} />
              )}
            </div>
          </div>

          <p className="text-center text-white/25 text-xs mt-4">
            Powered by WiFrii
          </p>
        </div>

        {showTerms && <TermsModal config={config} primaryColor={primaryColor} onClose={() => setShowTerms(false)} />}
      </div>
    );
  }

  // ── TABLET layout ────────────────────────────────────────────────────────────
  if (device === 'tablet') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10 relative overflow-hidden"
        style={config?.background_url ? bgStyle : fallbackBg}>
        <div className="absolute inset-0 bg-black/55" />
        {!config?.background_url && (
          <>
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
          </>
        )}

        <div className="portal-card relative z-10 w-full max-w-lg">
          {/* Badge top-right */}
          <div className="flex justify-end mb-3">
            <DeviceBadge device="tablet" />
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: primaryColor }} />

            <div className="p-8">
              {success ? (
                <SuccessScreen config={config} countdown={countdown} primaryColor={primaryColor} />
              ) : (
                <>
                  <LogoBlock center={true} size="md" />
                  <div className="portal-title text-center mb-7">
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {config?.welcome_title || 'Bienvenido'}
                    </h1>
                    <p className="text-white/65 text-base">
                      {config?.welcome_subtitle || 'Conéctate gratis al WiFi'}
                    </p>
                  </div>
                  <PortalForm {...formProps} twoColNames={true} />
                </>
              )}
            </div>
          </div>

          <p className="text-center text-white/25 text-xs mt-4">Powered by WiFrii</p>
        </div>

        {showTerms && <TermsModal config={config} primaryColor={primaryColor} onClose={() => setShowTerms(false)} />}
      </div>
    );
  }

  // ── DESKTOP layout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-8 py-10 relative overflow-hidden"
      style={config?.background_url ? bgStyle : fallbackBg}>
      <div className="absolute inset-0 bg-black/55" />
      {!config?.background_url && (
        <>
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl" />
        </>
      )}

      <div className="portal-card relative z-10 w-full max-w-4xl">
        {/* Badge */}
        <div className="flex justify-end mb-3">
          <DeviceBadge device="desktop" />
        </div>

        <div className="bg-white/8 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex">

          {/* ── Left panel: branding ── */}
          <div className="hidden lg:flex flex-col justify-between w-5/12 p-10 relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${primaryColor}22 0%, ${primaryColor}08 100%)`,
              borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: primaryColor }} />

            {/* Decorative circle */}
            <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-10"
              style={{ background: primaryColor }} />
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-5"
              style={{ background: primaryColor }} />

            <div>
              {/* Logo */}
              <div className="portal-logo mb-8">
                {config?.logo_url ? (
                  <img src={config.logo_url} alt={config?.business_name}
                    className="max-h-[100px] max-w-[200px] object-contain drop-shadow-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${primaryColor}44` }}>
                    <Wifi className="w-9 h-9" style={{ color: primaryColor }} />
                  </div>
                )}
                {config?.business_name && (
                  <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mt-3">
                    {config.business_name}
                  </p>
                )}
              </div>

              {/* Headings */}
              <div className="portal-title">
                <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                  {config?.welcome_title || 'Bienvenido'}
                </h1>
                <p className="text-white/60 text-lg leading-relaxed">
                  {config?.welcome_subtitle || 'Conéctate gratis al WiFi'}
                </p>
              </div>
            </div>

            {/* Bottom: WiFi icon decorative */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex gap-1.5">
                {[0.3, 0.6, 1].map((o, i) => (
                  <div key={i} className="w-1.5 rounded-full" style={{
                    height: `${(i + 1) * 10}px`,
                    background: primaryColor,
                    opacity: o,
                  }} />
                ))}
              </div>
              <span className="text-white/30 text-xs">WiFi seguro y gratuito</span>
            </div>
          </div>

          {/* ── Right panel: form ── */}
          <div className="flex-1 p-10">
            {/* Top accent (mobile fallback) */}
            <div className="lg:hidden h-0.5 w-full mb-6" style={{ background: primaryColor }} />

            {success ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <SuccessScreen config={config} countdown={countdown} primaryColor={primaryColor} />
              </div>
            ) : (
              <>
                {/* Show logo on small screens inside right panel */}
                <div className="lg:hidden mb-6">
                  <LogoBlock center={true} size="sm" />
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-1">{config?.welcome_title || 'Bienvenido'}</h1>
                    <p className="text-white/60 text-sm">{config?.welcome_subtitle || 'Conéctate gratis al WiFi'}</p>
                  </div>
                </div>

                <p className="text-white/40 text-sm mb-6 hidden lg:block">
                  Completá tus datos para acceder
                </p>
                <PortalForm {...formProps} twoColNames={true} />
              </>
            )}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">Powered by WiFrii</p>
      </div>

      {showTerms && <TermsModal config={config} primaryColor={primaryColor} onClose={() => setShowTerms(false)} />}
    </div>
  );
}

// ─── Terms modal (shared) ─────────────────────────────────────────────────────
function TermsModal({
  config, primaryColor, onClose,
}: { config: PortalConfig | null; primaryColor: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full max-h-[60vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-lg mb-4">Términos y Condiciones</h3>
        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
          {config?.terms_text || 'Al acceder usted acepta nuestros términos y condiciones de uso del servicio de WiFi gratuito.'}
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
          style={{ background: primaryColor }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
