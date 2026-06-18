-- Orbit Assistant - productos persistentes + ficha técnica + instalación + recomendaciones
-- Ejecutar en Supabase SQL Editor si tu base ya existe y quieres asegurar las columnas/tablas.

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  category_name TEXT,
  line_name TEXT,
  short_description TEXT,
  long_description TEXT,
  main_image_url TEXT,
  manual_pdf_url TEXT,
  installation_video_url TEXT,
  difficulty_level TEXT,
  usage_type TEXT,
  alcance TEXT,
  alcance_unit TEXT DEFAULT 'm',
  presion TEXT,
  presion_unit TEXT DEFAULT 'PSI',
  uso TEXT,
  conexion TEXT,
  conexion_unit TEXT,
  installation_description TEXT,
  specs JSONB DEFAULT '[]'::jsonb,
  installation_guide JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  ai_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS alcance TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alcance_unit TEXT DEFAULT 'm';
ALTER TABLE products ADD COLUMN IF NOT EXISTS presion TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS presion_unit TEXT DEFAULT 'PSI';
ALTER TABLE products ADD COLUMN IF NOT EXISTS uso TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS conexion TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS conexion_unit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS installation_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS installation_guide JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  source_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type TEXT,
  reason TEXT,
  priority INTEGER DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_product_id, recommended_product_id)
);

CREATE TABLE IF NOT EXISTS qrs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL,
  qr_url TEXT,
  qr_image_url TEXT,
  store_name TEXT,
  store_branch TEXT,
  region TEXT,
  campaign_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  product_id INTEGER,
  qr_id INTEGER,
  source TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  contacted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  qr_id INTEGER,
  product_id INTEGER,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  session_id TEXT,
  question TEXT,
  answer TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
