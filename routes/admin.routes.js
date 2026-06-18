import { Router } from 'express';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { db } from '../data/db.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'orbit_assistant_dev_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cliente-orbit.vercel.app';

const productDir = path.join(process.cwd(), 'uploads', 'products', 'main');
const qrDir = path.join(process.cwd(), 'uploads', 'qrs', 'png');
fs.mkdirSync(productDir, { recursive: true });
fs.mkdirSync(qrDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
    cb(null, true);
  }
});

function adminAuth(req,res,next){
  const token=(req.headers.authorization||'').replace('Bearer ','');
  if(!token) return res.status(401).json({message:'Token requerido'});
  try{ req.admin=jwt.verify(token, SECRET); next(); }
  catch(e){ res.status(401).json({message:'Token inválido'}); }
}

function slugify(value=''){
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function backendUrl(req){
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function normalizeProduct(req, existing={}){
  const b=req.body||{};
  const name=b.name || existing.name || '';
  const sku=b.sku || existing.sku || '';
  const uploaded=req.file ? `${backendUrl(req)}/uploads/products/main/${req.file.filename}` : null;

  return {
    ...existing,
    sku,
    name,
    slug:b.slug || existing.slug || slugify(name || sku || 'producto'),
    short_name:b.short_name || existing.short_name || name,
    category_name:b.category_name || existing.category_name || 'Aspersores',
    line_name:b.line_name || existing.line_name || '',
    short_description:b.short_description || existing.short_description || '',
    long_description:b.long_description || existing.long_description || '',
    main_image_url:uploaded || b.main_image_url || existing.main_image_url || '',
    manual_pdf_url:b.manual_pdf_url || existing.manual_pdf_url || '',
    installation_video_url:b.installation_video_url || existing.installation_video_url || '',
    difficulty_level:b.difficulty_level || existing.difficulty_level || '',
    usage_type:b.usage_type || existing.usage_type || '',
    is_featured:b.is_featured === 'true' || b.is_featured === true || existing.is_featured || false,
    is_active:b.is_active === 'false' ? false : true,
    ai_enabled:b.ai_enabled === 'false' ? false : true,
    specs:existing.specs || [],
    updated_at:new Date().toISOString()
  };
}

async function saveQrImage(req, qr){
  const publicUrl = `${FRONTEND_URL}/qr.html?qr=${encodeURIComponent(qr.qr_code)}`;
  const filename = `${qr.qr_code}.png`;
  const filepath = path.join(qrDir, filename);
  await QRCode.toFile(filepath, publicUrl, { width:900, margin:2, errorCorrectionLevel:'H' });
  qr.qr_url = publicUrl;
  qr.qr_image_url = `${backendUrl(req)}/uploads/qrs/png/${filename}`;
  return qr;
}

router.post('/auth/login',(req,res)=>{
  const {email,password}=req.body;
  if(email==='admin@orbitassistant.cl' && password==='admin123'){
    const token=jwt.sign({email,role:'super_admin'}, SECRET, {expiresIn:'7d'});
    return res.json({token,admin:{email,role:'super_admin'}});
  }
  res.status(401).json({message:'Credenciales incorrectas'});
});

router.get('/auth/me', adminAuth, (req,res)=>res.json({admin:req.admin}));

router.get('/analytics/overview', adminAuth, (req,res)=>res.json({
  products: db.products.length,
  scans: db.scans.length || 128,
  questions: db.questions.length || 34,
  leads: db.leads.length,
  recommendation_clicks: 42
}));

router.get('/products', adminAuth, (req,res)=>res.json({products:db.products}));

router.get('/products/:id', adminAuth, (req,res)=>{
  const product=db.products.find(p=>p.id===Number(req.params.id));
  if(!product) return res.status(404).json({message:'Producto no encontrado'});
  res.json({product});
});

router.post('/products', adminAuth, upload.single('main_image'), (req,res)=>{
  const product=normalizeProduct(req,{id:db.products.length+1,created_at:new Date().toISOString()});
  if(!product.sku || !product.name) return res.status(400).json({message:'SKU y nombre son obligatorios'});
  db.products.push(product);
  res.json({ok:true,product});
});

router.put('/products/:id', adminAuth, upload.single('main_image'), (req,res)=>{
  const idx=db.products.findIndex(p=>p.id===Number(req.params.id));
  if(idx<0) return res.status(404).json({message:'Producto no encontrado'});
  db.products[idx]=normalizeProduct(req, db.products[idx]);
  res.json({ok:true,product:db.products[idx]});
});

router.get('/categories', adminAuth, (req,res)=>res.json({items:db.categories}));
router.get('/lines', adminAuth, (req,res)=>res.json({items:db.lines}));
router.get('/compatibilities', adminAuth, (req,res)=>res.json({items:[]}));
router.get('/guides', adminAuth, (req,res)=>res.json({items:[{title:'Guía Aspersor Pop-Up', description:'Instalación básica', is_active:true}]}));

router.get('/recommendations', adminAuth, (req,res)=>{
  const recommendations=db.recommendations.map(r=>({
    ...r,
    source_name:db.products.find(p=>p.id===r.source_product_id)?.name,
    recommended_name:db.products.find(p=>p.id===r.recommended_product_id)?.name
  }));
  res.json({recommendations});
});

router.get('/qr', adminAuth, async (req,res)=>{
  for(const qr of db.qrs){ if(!qr.qr_image_url) await saveQrImage(req, qr); }
  res.json({qrs:db.qrs.map(q=>{
    const p=db.products.find(x=>x.id===q.product_id);
    return {...q,product_sku:p?.sku||'',product_name:p?.name||'Producto no encontrado',product_slug:p?.slug||''};
  })});
});

router.post('/qr/generate', adminAuth, async (req,res)=>{
  const product=db.products.find(p=>p.id===Number(req.body.productId));
  if(!product) return res.status(404).json({message:'Producto no encontrado para generar QR'});
  const code=req.body.qrCode || `${product.sku}-${Date.now().toString().slice(-5)}`;
  const qr={id:db.qrs.length+1,product_id:product.id,qr_code:code,store_name:req.body.store_name||'',store_branch:req.body.store_branch||'',region:req.body.region||'',campaign_name:req.body.campaign_name||'QR producto',is_active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  await saveQrImage(req, qr);
  db.qrs.push(qr);
  res.json({ok:true,qr,product});
});

router.get('/qr/:id/download', adminAuth, async (req,res)=>{
  const qr=db.qrs.find(q=>q.id===Number(req.params.id));
  if(!qr) return res.status(404).send('QR no encontrado');
  await saveQrImage(req, qr);
  const publicUrl = `${FRONTEND_URL}/qr.html?qr=${encodeURIComponent(qr.qr_code)}`;
  const format=req.query.format || 'png';

  if(format==='svg'){
    const svg=await QRCode.toString(publicUrl,{type:'svg'});
    res.setHeader('Content-Type','image/svg+xml');
    res.setHeader('Content-Disposition',`attachment; filename="${qr.qr_code}.svg"`);
    return res.send(svg);
  }

  if(format==='pdf'){
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${qr.qr_code}.pdf"`);
    return res.send(Buffer.from('%PDF-1.4\n% Orbit Assistant QR PDF demo\n'));
  }

  res.setHeader('Content-Type','image/png');
  res.setHeader('Content-Disposition',`attachment; filename="${qr.qr_code}.png"`);
  res.sendFile(path.join(qrDir, `${qr.qr_code}.png`));
});

router.get('/leads', adminAuth, (req,res)=>res.json({leads:db.leads.map(l=>({...l,product_name:db.products.find(p=>p.id===l.product_id)?.name || 'Sin producto'}))}));

router.get('/leads/export/csv', adminAuth, (req,res)=>{
  const rows=[['email','nombre','producto','fuente','acepta_marketing','fecha']];
  db.leads.forEach(l=>rows.push([l.email,l.name||'',db.products.find(p=>p.id===l.product_id)?.name||'',l.source,l.accepts_marketing?'si':'no',l.created_at]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="orbit-leads.csv"');
  res.send(csv);
});

router.get('/questions', adminAuth, (req,res)=>res.json({questions:db.questions}));

export default router;


