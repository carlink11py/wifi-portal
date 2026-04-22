import { createClient, Client } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';

const BASE_DIR = __dirname.endsWith(`${path.sep}dist`)
  ? path.join(__dirname, '..')
  : __dirname;
const DB_PATH = `file:${path.join(BASE_DIR, 'portal.db')}`;

export const db: Client = createClient({ url: DB_PATH });

export async function initDb(): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS portal_config (
      id INTEGER PRIMARY KEY,
      business_name TEXT NOT NULL DEFAULT '',
      logo_url TEXT DEFAULT '',
      background_url TEXT DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#e53e3e',
      welcome_title TEXT NOT NULL DEFAULT 'Bienvenido',
      welcome_subtitle TEXT NOT NULL DEFAULT 'Conéctate gratis al WiFi',
      button_text TEXT NOT NULL DEFAULT 'Acceder al WiFi',
      terms_text TEXT NOT NULL DEFAULT 'Al acceder usted acepta nuestros términos y condiciones de uso del servicio de WiFi gratuito.',
      require_name INTEGER NOT NULL DEFAULT 1,
      require_email INTEGER NOT NULL DEFAULT 1,
      require_phone INTEGER NOT NULL DEFAULT 0,
      require_gender INTEGER NOT NULL DEFAULT 0,
      require_birthdate INTEGER NOT NULL DEFAULT 0,
      redirect_url TEXT DEFAULT '',
      admin_password TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS portal_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      gender TEXT,
      birthdate TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existing = await db.execute('SELECT id FROM portal_config WHERE id = 1');
  if (existing.rows.length === 0) {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    await db.execute({
      sql: `INSERT INTO portal_config (
        id, business_name, logo_url, background_url, primary_color,
        welcome_title, welcome_subtitle, button_text, terms_text,
        require_name, require_email, require_phone, require_gender,
        require_birthdate, redirect_url, admin_password
      ) VALUES (
        1, '', '', '', '#e53e3e',
        'Bienvenido', 'Conéctate gratis al WiFi',
        'Acceder al WiFi',
        'Al acceder usted acepta nuestros términos y condiciones de uso del servicio de WiFi gratuito.',
        1, 1, 0, 0, 0, '', ?
      )`,
      args: [defaultPassword],
    });
    console.log('✅ Default config seeded (password: admin123)');
  }
}
