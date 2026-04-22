import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import type { InValue } from '@libsql/client';
import { db, initDb } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Works from both backend/ (dev via ts-node) and backend/dist/ (prod compiled)
const BASE_DIR = __dirname.endsWith(`${path.sep}dist`)
  ? path.join(__dirname, '..')
  : __dirname;
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Use jpg, png, webp o gif.'));
    }
  },
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
interface AuthRequest extends Request {
  admin?: boolean;
}

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

// ─── Public routes ────────────────────────────────────────────────────────────
app.get('/api/config', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT id, business_name, logo_url, background_url, primary_color,
             welcome_title, welcome_subtitle, button_text, terms_text,
             require_name, require_email, require_phone, require_gender,
             require_birthdate, redirect_url
      FROM portal_config WHERE id = 1
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Configuración no encontrada' });
      return;
    }
    res.json(rowToObject(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/login', async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: 'Contraseña requerida' }); return; }

  try {
    const result = await db.execute('SELECT admin_password FROM portal_config WHERE id = 1');
    if (result.rows.length === 0) { res.status(401).json({ error: 'Configuración no encontrada' }); return; }

    const hash = String(result.rows[0].admin_password ?? '');
    if (!bcrypt.compareSync(password, hash)) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/portal/access', async (req: Request, res: Response) => {
  const { first_name, last_name, email, phone, gender, birthdate } =
    req.body as Record<string, string | undefined>;
  const ip_address =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress || '';
  const user_agent = req.headers['user-agent'] || '';

  try {
    await db.execute({
      sql: `INSERT INTO portal_leads (first_name, last_name, email, phone, gender, birthdate, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        first_name || '', last_name || '', email || '',
        phone || '', gender || '', birthdate || '',
        ip_address, user_agent,
      ],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.get('/api/admin/config', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM portal_config WHERE id = 1');
    if (result.rows.length === 0) { res.status(404).json({ error: 'No encontrado' }); return; }
    const obj = rowToObject(result.rows[0]);
    delete obj['admin_password'];
    res.json(obj);
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.put('/api/admin/config', requireAuth, async (req: Request, res: Response) => {
  const allowed = [
    'business_name', 'logo_url', 'background_url', 'primary_color',
    'welcome_title', 'welcome_subtitle', 'button_text', 'terms_text',
    'require_name', 'require_email', 'require_phone', 'require_gender',
    'require_birthdate', 'redirect_url',
  ];

  const updates = req.body as Record<string, unknown>;
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (updates.new_password && typeof updates.new_password === 'string') {
    fields.push('admin_password = ?');
    values.push(bcrypt.hashSync(updates.new_password, 10));
  }

  if (fields.length === 0) { res.status(400).json({ error: 'Sin campos para actualizar' }); return; }

  values.push(1);
  try {
    await db.execute({
      sql: `UPDATE portal_config SET ${fields.join(', ')} WHERE id = ?`,
      args: values as InValue[],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/admin/upload', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió archivo' }); return; }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/admin/leads', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
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
    res.json({
      leads: leadsResult.rows.map(rowToObject),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.delete('/api/admin/leads/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM portal_leads WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) { res.status(404).json({ error: 'Lead no encontrado' }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── Static frontend (production) ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const FRONTEND_DIST = path.join(BASE_DIR, '..', 'frontend', 'dist');
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row));
}

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });

export default app;
