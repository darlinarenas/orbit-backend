import { Pool } from 'pg';
import { db } from './db.js';

const hasDatabase = !!process.env.DATABASE_URL;
const pool = hasDatabase ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
}) : null;

let initialized = false;

function boolValue(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true';
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildSpecs(product) {
  return [
    { spec_key: 'alcance', spec_label: 'Alcance', spec_value: product.alcance || '', spec_unit: product.alcance_unit || '' },
    { spec_key: 'presion', spec_label: 'Presión', spec_value: product.presion || '', spec_unit: product.presion_unit || '' },
    { spec_key: 'uso', spec_label: 'Uso', spec_value: product.uso || product.usage_type || '', spec_unit: '' },
    { spec_key: 'conexion', spec_label: 'Conexión', spec_value: product.conexion || '', spec_unit: product.conexion_unit || '' }
  ].filter(s => s.spec_value);
}

function buildInstallationGuide(product) {
  return {
    title: 'Guía de instalación',
    description: product.installation_description || 'Revisa el video y completa la instalación con productos compatibles.',
    main_video_url: product.installation_video_url || '',
    steps: [
      { step_number: 1, title: 'Revisa ficha técnica', description: 'Valida alcance, presión, uso y conexión antes de instalar.' },
      { step_number: 2, title: 'Prepara los accesorios', description: 'Ten a mano boquilla, conectores, tubería, filtro y programador si aplica.' },
      { step_number: 3, title: 'Instala y prueba', description: 'Conecta el producto, abre el agua y ajusta cobertura/presión.' }
    ]
  };
}

export function normalizeProductPayload(body = {}, existing = {}, mainImageUrl = '') {
  const product = {
    ...existing,
    sku: body.sku ?? existing.sku ?? '',
    name: body.name ?? existing.name ?? '',
    slug: body.slug || existing.slug || slugify(body.name || body.sku || existing.name || existing.sku || 'producto'),
    short_name: body.short_name || existing.short_name || body.name || existing.name || '',
    category_name: body.category_name ?? existing.category_name ?? 'Aspersores',
    line_name: body.line_name ?? existing.line_name ?? '',
    short_description: body.short_description ?? existing.short_description ?? '',
    long_description: body.long_description ?? existing.long_description ?? '',
    main_image_url: mainImageUrl || body.main_image_url || existing.main_image_url || '',
    manual_pdf_url: body.manual_pdf_url ?? existing.manual_pdf_url ?? '',
    installation_video_url: body.installation_video_url ?? existing.installation_video_url ?? '',
    difficulty_level: body.difficulty_level ?? existing.difficulty_level ?? '',
    usage_type: body.usage_type ?? existing.usage_type ?? body.uso ?? '',
    alcance: body.alcance ?? existing.alcance ?? '',
    alcance_unit: body.alcance_unit ?? existing.alcance_unit ?? 'm',
    presion: body.presion ?? existing.presion ?? '',
    presion_unit: body.presion_unit ?? existing.presion_unit ?? 'PSI',
    uso: body.uso ?? existing.uso ?? body.usage_type ?? existing.usage_type ?? '',
    conexion: body.conexion ?? existing.conexion ?? '',
    conexion_unit: body.conexion_unit ?? existing.conexion_unit ?? '',
    installation_description: body.installation_description ?? existing.installation_description ?? '',
    is_featured: boolValue(body.is_featured, existing.is_featured || false),
    is_active: boolValue(body.is_active, existing.is_active !== false),
    ai_enabled: boolValue(body.ai_enabled, existing.ai_enabled !== false),
    updated_at: new Date().toISOString()
  };
  product.specs = buildSpecs(product);
  product.installation_guide = buildInstallationGuide(product);
  return product;
}

async function ensureDatabase() {
  if (!pool || initialized) return;
  initialized = true;
  await pool.query(`
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
  `);
}

async function query(sql, params = []) {
  await ensureDatabase();
  return pool.query(sql, params);
}

function rowProduct(row) {
  return row ? { ...row, specs: row.specs || [], installation_guide: row.installation_guide || {} } : null;
}

async function seedIfEmpty() {
  if (!pool) return;
  await ensureDatabase();
  const count = await query('SELECT COUNT(*)::int AS count FROM products');
  if (count.rows[0].count > 0) return;
  for (const p of db.products) {
    const product = normalizeProductPayload(p, p, p.main_image_url || '');
    await createProduct(product, false);
  }
}

export async function listProducts() {
  if (!pool) return db.products;
  await seedIfEmpty();
  const result = await query('SELECT * FROM products ORDER BY id DESC');
  return result.rows.map(rowProduct);
}

export async function getProductById(id) {
  if (!pool) return db.products.find(p => p.id === Number(id));
  await seedIfEmpty();
  const result = await query('SELECT * FROM products WHERE id=$1', [id]);
  return rowProduct(result.rows[0]);
}

export async function getProductBySlug(slug, onlyActive = false) {
  if (!pool) return db.products.find(p => p.slug === slug && (!onlyActive || p.is_active));
  await seedIfEmpty();
  const result = await query(`SELECT * FROM products WHERE slug=$1 ${onlyActive ? 'AND is_active=true' : ''}`, [slug]);
  return rowProduct(result.rows[0]);
}

export async function createProduct(product, generate = true) {
  if (!pool) {
    const id = db.products.length ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
    const saved = { ...product, id, created_at: new Date().toISOString() };
    db.products.push(saved);
    if (generate) generateSmartRecommendationsMemory(saved);
    return saved;
  }
  const result = await query(`
    INSERT INTO products (sku, slug, name, short_name, category_name, line_name, short_description, long_description, main_image_url, manual_pdf_url, installation_video_url, difficulty_level, usage_type, alcance, alcance_unit, presion, presion_unit, uso, conexion, conexion_unit, installation_description, specs, installation_guide, is_featured, is_active, ai_enabled)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23::jsonb,$24,$25,$26)
    RETURNING *`, [product.sku, product.slug, product.name, product.short_name, product.category_name, product.line_name, product.short_description, product.long_description, product.main_image_url, product.manual_pdf_url, product.installation_video_url, product.difficulty_level, product.usage_type, product.alcance, product.alcance_unit, product.presion, product.presion_unit, product.uso, product.conexion, product.conexion_unit, product.installation_description, JSON.stringify(product.specs), JSON.stringify(product.installation_guide), product.is_featured, product.is_active, product.ai_enabled]);
  const saved = rowProduct(result.rows[0]);
  if (generate) await generateSmartRecommendations(saved);
  return saved;
}

export async function updateProduct(id, product) {
  if (!pool) {
    const idx = db.products.findIndex(p => p.id === Number(id));
    if (idx < 0) return null;
    db.products[idx] = { ...db.products[idx], ...product, id: Number(id) };
    generateSmartRecommendationsMemory(db.products[idx]);
    return db.products[idx];
  }
  const result = await query(`
    UPDATE products SET sku=$1, slug=$2, name=$3, short_name=$4, category_name=$5, line_name=$6, short_description=$7, long_description=$8, main_image_url=$9, manual_pdf_url=$10, installation_video_url=$11, difficulty_level=$12, usage_type=$13, alcance=$14, alcance_unit=$15, presion=$16, presion_unit=$17, uso=$18, conexion=$19, conexion_unit=$20, installation_description=$21, specs=$22::jsonb, installation_guide=$23::jsonb, is_featured=$24, is_active=$25, ai_enabled=$26, updated_at=now()
    WHERE id=$27 RETURNING *`, [product.sku, product.slug, product.name, product.short_name, product.category_name, product.line_name, product.short_description, product.long_description, product.main_image_url, product.manual_pdf_url, product.installation_video_url, product.difficulty_level, product.usage_type, product.alcance, product.alcance_unit, product.presion, product.presion_unit, product.uso, product.conexion, product.conexion_unit, product.installation_description, JSON.stringify(product.specs), JSON.stringify(product.installation_guide), product.is_featured, product.is_active, product.ai_enabled, id]);
  const saved = rowProduct(result.rows[0]);
  if (saved) await generateSmartRecommendations(saved);
  return saved;
}

const rules = [
  { match: ['pop', 'aspersor', 'sprinkler'], want: ['boquilla', 'conector', 'tuberia', 'tubería', 'programador', 'filtro'] },
  { match: ['boquilla'], want: ['aspersor', 'conector', 'tuberia', 'tubería', 'filtro'] },
  { match: ['programador'], want: ['aspersor', 'boquilla', 'tuberia', 'tubería', 'filtro'] },
  { match: ['goteo', 'gotero'], want: ['tuberia', 'tubería', 'conector', 'filtro', 'programador'] }
];

function smartTargets(product, products) {
  const text = `${product.name} ${product.category_name} ${product.usage_type} ${product.uso}`.toLowerCase();
  const rule = rules.find(r => r.match.some(k => text.includes(k))) || { want: ['boquilla', 'conector', 'tuberia', 'tubería', 'programador', 'filtro'] };
  return products
    .filter(p => p.id !== product.id)
    .map(p => ({ product: p, text: `${p.name} ${p.category_name} ${p.short_description || ''}`.toLowerCase() }))
    .filter(x => rule.want.some(k => x.text.includes(k)))
    .slice(0, 6)
    .map((x, idx) => ({ product: x.product, priority: idx + 1 }));
}

function recommendationLabel(name = '') {
  const t = name.toLowerCase();
  if (t.includes('boquilla')) return ['Clave', 'Controla la salida, cobertura y patrón de riego.'];
  if (t.includes('conector')) return ['Necesario', 'Permite unir el producto a la línea de riego.'];
  if (t.includes('tuber')) return ['Según área', 'Ayuda a distribuir el agua hasta la zona de instalación.'];
  if (t.includes('programador')) return ['Premium', 'Automatiza horarios y mejora el ahorro de agua.'];
  if (t.includes('filtro')) return ['Recomendado', 'Protege el sistema de partículas y suciedad.'];
  return ['Compatible', 'Producto relacionado para completar la instalación.'];
}

async function generateSmartRecommendations(product) {
  const products = await listProducts();
  const targets = smartTargets(product, products);
  await query('DELETE FROM recommendations WHERE source_product_id=$1', [product.id]);
  for (const target of targets) {
    const [type, reason] = recommendationLabel(target.product.name || target.product.category_name || '');
    await query('INSERT INTO recommendations (source_product_id, recommended_product_id, recommendation_type, reason, priority) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (source_product_id, recommended_product_id) DO UPDATE SET recommendation_type=EXCLUDED.recommendation_type, reason=EXCLUDED.reason, priority=EXCLUDED.priority', [product.id, target.product.id, type, reason, target.priority]);
  }
}

function generateSmartRecommendationsMemory(product) {
  db.recommendations = db.recommendations.filter(r => r.source_product_id !== product.id);
  smartTargets(product, db.products).forEach((target) => {
    const [recommendation_type, reason] = recommendationLabel(target.product.name || target.product.category_name || '');
    db.recommendations.push({ id: db.recommendations.length + 1, source_product_id: product.id, recommended_product_id: target.product.id, recommendation_type, reason, priority: target.priority });
  });
}

export async function listRecommendations() {
  if (!pool) return db.recommendations;
  await seedIfEmpty();
  const result = await query('SELECT * FROM recommendations ORDER BY source_product_id, priority');
  return result.rows;
}

export async function recommendationsForProduct(productId) {
  if (!pool) return db.recommendations.filter(r => r.source_product_id === Number(productId)).sort((a, b) => a.priority - b.priority);
  const result = await query('SELECT * FROM recommendations WHERE source_product_id=$1 ORDER BY priority', [productId]);
  return result.rows;
}

export async function count(table) {
  if (!pool) return db[table]?.length || 0;
  await seedIfEmpty();
  const result = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
  return result.rows[0].count;
}

export async function listQrs() {
  if (!pool) return db.qrs;
  const result = await query('SELECT * FROM qrs ORDER BY id DESC');
  return result.rows;
}

export async function createQr(qr) {
  if (!pool) { db.qrs.push({ ...qr, id: db.qrs.length + 1 }); return db.qrs.at(-1); }
  const result = await query('INSERT INTO qrs (product_id, qr_code, qr_url, qr_image_url, store_name, store_branch, region, campaign_name, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [qr.product_id, qr.qr_code, qr.qr_url, qr.qr_image_url, qr.store_name, qr.store_branch, qr.region, qr.campaign_name, qr.is_active]);
  return result.rows[0];
}

export async function updateQrImage(id, qr_url, qr_image_url) {
  if (!pool) { const q = db.qrs.find(x => x.id === id); if (q) Object.assign(q, { qr_url, qr_image_url }); return q; }
  const result = await query('UPDATE qrs SET qr_url=$1, qr_image_url=$2, updated_at=now() WHERE id=$3 RETURNING *', [qr_url, qr_image_url, id]);
  return result.rows[0];
}


export async function getQrById(id) {
  if (!pool) return db.qrs.find(q => q.id === Number(id));
  const result = await query('SELECT * FROM qrs WHERE id=$1', [id]);
  return result.rows[0];
}

export async function getQrByCode(code) {
  if (!pool) return db.qrs.find(q => q.qr_code === code && q.is_active);
  const result = await query('SELECT * FROM qrs WHERE qr_code=$1 AND is_active=true', [code]);
  return result.rows[0];
}

export async function addScan(scan) {
  if (!pool) { db.scans.push({ ...scan, id: db.scans.length + 1 }); return; }
  await query('INSERT INTO scans (qr_id, product_id, user_agent) VALUES ($1,$2,$3)', [scan.qr_id, scan.product_id, scan.user_agent]);
}

export async function addLead(lead) {
  if (!pool) { const saved = { ...lead, id: db.leads.length + 1, created_at: new Date().toISOString() }; db.leads.push(saved); return saved; }
  const result = await query('INSERT INTO leads (email, name, product_id, qr_id, source, accepts_marketing, contacted) VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *', [lead.email, lead.name, lead.product_id, lead.qr_id, lead.source, lead.accepts_marketing]);
  return result.rows[0];
}

export async function listLeads() {
  if (!pool) return db.leads;
  const result = await query('SELECT * FROM leads ORDER BY id DESC');
  return result.rows;
}

export async function addQuestion(question) {
  if (!pool) { db.questions.push({ ...question, id: db.questions.length + 1, created_at: new Date().toISOString() }); return; }
  await query('INSERT INTO questions (product_id, session_id, question, answer, source) VALUES ($1,$2,$3,$4,$5)', [question.product_id, question.session_id, question.question, question.answer, question.source]);
}

export async function listQuestions() {
  if (!pool) return db.questions;
  const result = await query('SELECT * FROM questions ORDER BY id DESC');
  return result.rows;
}

export { hasDatabase };
