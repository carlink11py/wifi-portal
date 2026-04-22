import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import type { InValue } from '@libsql/client';
import { db, initDb } from './db';

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT        || 3000;
const JWT_SECRET = process.env.JWT_SECRET  || 'dev-secret-change-in-production';
const IS_PROD    = process.env.NODE_ENV === 'production';

const BASE_DIR = __dirname.endsWith(`${path.sep}dist`)
  ? path.join(__dirname, '..')
  : __dirname;
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

// Trust first proxy (Railway / Render put a reverse proxy in front)
app.set('trust proxy', 1);

// ─── 1. Helmet (security headers) ────────────────────────────────────────────
app.use(
  helmet({
    // Removes X-Powered-By
    hidePoweredBy: true,

    // HSTS: 1 year, include sub-domains, allow preload
    hsts: IS_PROD
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,

    // Prevent clickjacking
    frameguard: { action: 'deny' },

    // Prevent MIME sniffing
    noSniff: true,

    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // CSP — tight but functional for the React SPA + Google Fonts
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:         ["'self'", 'data:', 'blob:'],
        connectSrc:     ["'self'"],
        frameSrc:       ["'none'"],
        objectSrc:      ["'none'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },


    // Permissions-Policy — disable unnecessary browser features
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }),
);

// Permissions-Policy header (Helmet doesn't set this natively yet)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  next();
});

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const DEV_ORIGINS  = ['http://localhost:5173', 'http://localhost:3000'];
const PROD_ORIGINS = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN]
  : [];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no Origin header) and same-origin requests
      if (!origin) return cb(null, true);
      const allowed = IS_PROD ? PROD_ORIGINS : DEV_ORIGINS;
      if (allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ─── 3. Rate limiters ─────────────────────────────────────────────────────────
const makeLimiter = (max: number, message: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    // Skip in test environment
    skip: () => process.env.NODE_ENV === 'test',
  });

const generalLimiter = makeLimiter(100, 'Demasiadas solicitudes. Intente más tarde.');
const loginLimiter   = makeLimiter(10,  'Demasiados intentos de inicio de sesión. Intente en 15 minutos.');
const accessLimiter  = makeLimiter(5,   'Demasiadas solicitudes de acceso. Intente en 15 minutos.');

// Apply general limiter to all /api/* routes
app.use('/api', generalLimiter);

// ─── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    // No directory listing
    index: false,
    // Cache for 24 h
    maxAge: '1d',
  }),
);

// ─── 9. robots.txt ───────────────────────────────────────────────────────────
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /api/\nDisallow: /uploads/\n');
});

// ─── 4. Zod schemas ───────────────────────────────────────────────────────────
const loginSchema = z.object({
  password: z.string().min(1, 'Contraseña requerida').max(200),
});

const portalAccessSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido').max(50).optional().or(z.literal('')),
  last_name:  z.string().min(1, 'Apellido requerido').max(50).optional().or(z.literal('')),
  email:      z.string().email('Email inválido').max(254).optional().or(z.literal('')),
  phone:      z.string().regex(/^[\d\s\-+()]*$/, 'Teléfono inválido').max(30).optional().or(z.literal('')),
  gender:     z.enum(['Masculino', 'Femenino', 'Prefiero no decir', '']).optional(),
  birthdate:  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((d) => {
      const dt = new Date(d);
      return !isNaN(dt.getTime()) && dt.getFullYear() >= 1900 && dt.getFullYear() <= new Date().getFullYear();
    }, 'Fecha fuera de rango')
    .optional()
    .or(z.literal('')),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (use formato #RRGGBB)');
const urlOrEmpty = z
  .string()
  .max(2048)
  .refine((v) => v === '' || /^https?:\/\/.+/.test(v), 'URL inválida')
  .optional()
  .or(z.literal(''));

const adminConfigSchema = z.object({
  business_name:   z.string().max(100).optional(),
  logo_url:        urlOrEmpty,
  background_url:  urlOrEmpty,
  primary_color:   hexColor.optional(),
  welcome_title:   z.string().max(100).optional(),
  welcome_subtitle:z.string().max(200).optional(),
  button_text:     z.string().max(60).optional(),
  terms_text:      z.string().max(5000).optional(),
  require_name:    z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  require_email:   z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  require_phone:   z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  require_gender:  z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  require_birthdate: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  redirect_url:    urlOrEmpty,
  new_password:    z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(200).optional(),
}).strict();

// Parse Zod errors into a single readable message
function zodMessage(err: z.ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

// ─── 6. Sanitizer ─────────────────────────────────────────────────────────────
// Strips ALL HTML tags and attributes — prevents stored XSS
function sanitize(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function sanitizeRecord(obj: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v ? sanitize(v) : '';
  }
  return out;
}

// ─── 7. File upload — magic-byte MIME validation + filename sanitization ──────
const ALLOWED_MIMES: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/png':  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  'image/gif':  Buffer.from([0x47, 0x49, 0x46, 0x38]),
  // WebP: RIFF....WEBP
};

function validateMagicBytes(filePath: string): boolean {
  const buf = fs.readFileSync(filePath);

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: bytes 0-3 = RIFF, bytes 8-11 = WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;

  return false;
}

function sanitizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z]/g, '');
  const base = path
    .basename(original, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${base}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    const allowedMime = /^image\/(jpeg|png|webp|gif)$/;
    if (allowed.test(file.originalname) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Use jpg, png, webp o gif.'));
    }
  },
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
interface AuthRequest extends Request { admin?: boolean }

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.admin = true;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ─── 8. Central error handler ─────────────────────────────────────────────────
function internalError(res: Response, err: unknown): void {
  if (!IS_PROD) console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/config — public
app.get('/api/config', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT id, business_name, logo_url, background_url, primary_color,
             welcome_title, welcome_subtitle, button_text, terms_text,
             require_name, require_email, require_phone, require_gender,
             require_birthdate, redirect_url
      FROM portal_config WHERE id = 1
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Configuración no encontrada' }); return; }
    res.json(rowToObject(result.rows[0]));
  } catch (err) { internalError(res, err); }
});

// POST /api/login — public + rate limited
app.post('/api/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodMessage(parsed.error) });
    return;
  }

  try {
    const result = await db.execute('SELECT admin_password FROM portal_config WHERE id = 1');
    if (result.rows.length === 0) { res.status(401).json({ error: 'No autorizado' }); return; }

    const hash = String(result.rows[0].admin_password ?? '');
    if (!bcrypt.compareSync(parsed.data.password, hash)) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) { internalError(res, err); }
});

// POST /api/portal/access — public + rate limited
app.post('/api/portal/access', accessLimiter, async (req: Request, res: Response) => {
  const parsed = portalAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodMessage(parsed.error) });
    return;
  }

  // 6. Sanitize all string inputs before storing
  const clean = sanitizeRecord({
    first_name: parsed.data.first_name ?? '',
    last_name:  parsed.data.last_name  ?? '',
    email:      parsed.data.email      ?? '',
    phone:      parsed.data.phone      ?? '',
    gender:     parsed.data.gender     ?? '',
    birthdate:  parsed.data.birthdate  ?? '',
  });

  const ip_address =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress || '';
  const user_agent = (req.headers['user-agent'] || '').slice(0, 512);

  try {
    await db.execute({
      sql: `INSERT INTO portal_leads
              (first_name, last_name, email, phone, gender, birthdate, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clean.first_name, clean.last_name, clean.email,
        clean.phone,      clean.gender,    clean.birthdate,
        ip_address,       user_agent,
      ],
    });
    res.json({ success: true });
  } catch (err) { internalError(res, err); }
});

// GET /api/admin/config — protected
app.get('/api/admin/config', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM portal_config WHERE id = 1');
    if (result.rows.length === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
    const obj = rowToObject(result.rows[0]);
    delete obj['admin_password'];
    res.json(obj);
  } catch (err) { internalError(res, err); }
});

// PUT /api/admin/config — protected + validated
app.put('/api/admin/config', requireAuth, async (req: Request, res: Response) => {
  const parsed = adminConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodMessage(parsed.error) });
    return;
  }

  // Fields that map directly to DB columns (all from the whitelist)
  const ALLOWED_COLS = [
    'business_name', 'logo_url', 'background_url', 'primary_color',
    'welcome_title', 'welcome_subtitle', 'button_text', 'terms_text',
    'require_name', 'require_email', 'require_phone', 'require_gender',
    'require_birthdate', 'redirect_url',
  ] as const;

  const data = parsed.data as Record<string, unknown>;
  const fields: string[] = [];
  const values: InValue[] = [];

  for (const col of ALLOWED_COLS) {
    if (col in data && data[col] !== undefined) {
      // Sanitize text fields, pass booleans/numbers as-is
      const v = data[col];
      const sanitized =
        typeof v === 'string' &&
        ['business_name','welcome_title','welcome_subtitle','button_text','terms_text'].includes(col)
          ? sanitize(v)
          : v;

      fields.push(`${col} = ?`);
      values.push(sanitized as InValue);
    }
  }

  if (data.new_password && typeof data.new_password === 'string') {
    fields.push('admin_password = ?');
    values.push(bcrypt.hashSync(data.new_password, 10));
  }

  if (fields.length === 0) { res.status(400).json({ error: 'Sin campos para actualizar' }); return; }

  values.push(1); // WHERE id = 1
  try {
    await db.execute({
      sql: `UPDATE portal_config SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });
    res.json({ success: true });
  } catch (err) { internalError(res, err); }
});

// POST /api/admin/upload — protected, MIME + magic-bytes validated
app.post(
  '/api/admin/upload',
  requireAuth,
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No se recibió archivo' }); return; }

    // 7. Server-side magic-byte validation
    if (!validateMagicBytes(req.file.path)) {
      fs.unlinkSync(req.file.path); // delete the rejected file
      res.status(400).json({ error: 'El archivo no es una imagen válida' });
      return;
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  },
);

// GET /api/admin/leads — protected
app.get('/api/admin/leads', requireAuth, async (req: Request, res: Response) => {
  const pageRaw = parseInt((req.query.page as string) || '1', 10);
  const page  = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const totalResult = await db.execute('SELECT COUNT(*) as count FROM portal_leads');
    const total = Number(totalResult.rows[0].count ?? 0);
    const leadsResult = await db.execute({
      sql: `SELECT id, first_name, last_name, email, phone, gender, birthdate, ip_address, created_at
            FROM portal_leads ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });
    res.json({ leads: leadsResult.rows.map(rowToObject), total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { internalError(res, err); }
});

// DELETE /api/admin/leads/:id — protected
app.delete('/api/admin/leads/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const result = await db.execute({ sql: 'DELETE FROM portal_leads WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) { res.status(404).json({ error: 'Lead no encontrado' }); return; }
    res.json({ success: true });
  } catch (err) { internalError(res, err); }
});

// ─── Static frontend (production) ─────────────────────────────────────────────
if (IS_PROD) {
  const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(FRONTEND_DIST, { index: false }));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  });
}

// ─── 8. Global error handler (no stack traces in production) ──────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (!IS_PROD) console.error(err.stack);
  // Multer errors
  if (err.message?.includes('File too large')) {
    res.status(413).json({ error: 'El archivo supera el límite de 5MB' });
    return;
  }
  if (err.message?.includes('CORS')) {
    res.status(403).json({ error: 'Origen no permitido' });
    return;
  }
  res.status(500).json({ error: IS_PROD ? 'Error interno del servidor' : err.message });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row));
}

// ─── Start ────────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      if (!IS_PROD) console.log('⚠️  Running in DEVELOPMENT mode (CORS open to localhost)');
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });

export default app;
