import { Router } from 'express';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  normalizeProductPayload, listProducts, getProductById, createProduct, updateProduct, deleteProduct,
  listRecommendations, recommendationsForProduct, count, listQrs, createQr, updateQrImage,
  listLeads, listQuestions, getQrById
} from '../data/store.js';

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
  const uploaded = req.file ? `${backendUrl(req)}/uploads/products/main/${req.file.filename}` : '';
  return normalizeProductPayload(req.body || {}, existing, uploaded);
}


async function saveQrImage(req, qr){
  const publicUrl = `${FRONTEND_URL}/qr.html?qr=${encodeURIComponent(qr.qr_code)}`;
  const filename = `${qr.qr_code}.png`;
  const filepath = path.join(qrDir, filename);
  await QRCode.toFile(filepath, publicUrl, { width:900, margin:2, errorCorrectionLevel:'H' });
  qr.qr_url = publicUrl;
  qr.qr_image_url = `${backendUrl(req)}/uploads/qrs/png/${filename}`;
  if (qr.id) await updateQrImage(qr.id, qr.qr_url, qr.qr_image_url);
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

router.get('/analytics/overview', adminAuth, async (req,res,next)=>{
  try {
    res.json({
      products: await count('products'),
      scans: await count('scans'),
      questions: await count('questions'),
      leads: await count('leads'),
      recommendation_clicks: 42
    });
  } catch (e) { next(e); }
});

router.get('/products', adminAuth, async (req,res,next)=>{
  try { res.json({products: await listProducts()}); }
  catch(e){ next(e); }
});

router.get('/products/:id', adminAuth, async (req,res,next)=>{
  try {
    const product = await getProductById(Number(req.params.id));
    if(!product) return res.status(404).json({message:'Producto no encontrado'});
    res.json({product});
  } catch(e){ next(e); }
});

router.post('/products', adminAuth, upload.single('main_image'), async (req,res,next)=>{
  try {
    const product = normalizeProduct(req, {created_at:new Date().toISOString()});
    if(!product.sku || !product.name) return res.status(400).json({message:'SKU y nombre son obligatorios'});
    const saved = await createProduct(product);
    res.json({ok:true,product:saved});
  } catch(e){ next(e); }
});


router.delete('/products/:id', adminAuth, async (req,res,next)=>{
  try {
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({message:'ID de producto inválido'});
    await deleteProduct(id);
    res.json({ok:true,message:'Producto eliminado'});
  } catch(e){ next(e); }
});

router.put('/products/:id', adminAuth, upload.single('main_image'), async (req,res,next)=>{
  try {
    const existing = await getProductById(Number(req.params.id));
    if(!existing) return res.status(404).json({message:'Producto no encontrado'});
    const product = normalizeProduct(req, existing);
    const saved = await updateProduct(Number(req.params.id), product);
    res.json({ok:true,product:saved});
  } catch(e){ next(e); }
});

router.get('/categories', adminAuth, async (req,res,next)=>{
  try {
    const products = await listProducts();
    const names = [...new Set(products.map(p => p.category_name).filter(Boolean))];
    res.json({items:names.map((name, index)=>({id:index+1, name, slug:slugify(name), is_active:true}))});
  } catch(e){ next(e); }
});

router.get('/lines', adminAuth, async (req,res,next)=>{
  try {
    const products = await listProducts();
    const names = [...new Set(products.map(p => p.line_name).filter(Boolean))];
    res.json({items:names.map((name, index)=>({id:index+1, name, slug:slugify(name), is_active:true}))});
  } catch(e){ next(e); }
});
router.get('/compatibilities', adminAuth, (req,res)=>res.json({items:[]}));
router.get('/guides', adminAuth, (req,res)=>res.json({items:[{title:'Guía Aspersor Pop-Up', description:'Instalación básica', is_active:true}]}));

router.get('/recommendations', adminAuth, async (req,res,next)=>{
  try {
    const products = await listProducts();
    const recommendations = (await listRecommendations()).map(r=>({
      ...r,
      source_name:products.find(p=>p.id===r.source_product_id)?.name,
      recommended_name:products.find(p=>p.id===r.recommended_product_id)?.name
    }));
    res.json({recommendations});
  } catch(e){ next(e); }
});

router.get('/qr', adminAuth, async (req,res,next)=>{
  try {
    const qrs = await listQrs();
    for(const qr of qrs){ if(!qr.qr_image_url) await saveQrImage(req, qr); }
    const products = await listProducts();
    res.json({qrs:qrs.map(q=>{
      const p=products.find(x=>x.id===q.product_id);
      return {...q,product_sku:p?.sku||'',product_name:p?.name||'Producto no encontrado',product_slug:p?.slug||''};
    })});
  } catch(e){ next(e); }
});

router.post('/qr/generate', adminAuth, async (req,res,next)=>{
  try {
    const productId = Number(req.body.productId);
    if(!productId) return res.status(400).json({message:'productId requerido para generar QR'});
    const product=await getProductById(productId);
    if(!product) return res.status(404).json({message:'Producto no encontrado para generar QR'});
    const code=req.body.qrCode || `${product.sku}-${Date.now().toString().slice(-5)}`;
    let qr={product_id:product.id,qr_code:code,store_name:req.body.store_name||'',store_branch:req.body.store_branch||'',region:req.body.region||'',campaign_name:req.body.campaign_name||'QR producto',is_active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    qr = await createQr(qr);
    qr = await saveQrImage(req, qr);
    res.json({ok:true,qr,product});
  } catch(e){ next(e); }
});


router.get('/qr/:id/download', adminAuth, async (req,res,next)=>{
  try {
    const qr = await getQrById(Number(req.params.id));
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
  } catch(e){ next(e); }
});


router.get('/leads', adminAuth, async (req,res,next)=>{
  try {
    const products = await listProducts();
    const leads = (await listLeads()).map(l=>({...l,product_name:products.find(p=>p.id===l.product_id)?.name || 'Sin producto'}));
    res.json({leads});
  } catch(e){ next(e); }
});

router.get('/leads/export/csv', adminAuth, async (req,res,next)=>{
  try {
    const products = await listProducts();
    const rows=[['email','nombre','producto','fuente','acepta_marketing','fecha']];
    (await listLeads()).forEach(l=>rows.push([l.email,l.name||'',products.find(p=>p.id===l.product_id)?.name||'',l.source,l.accepts_marketing?'si':'no',l.created_at]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="orbit-leads.csv"`);
    res.send(csv);
  } catch(e){ next(e); }
});


router.get('/questions', adminAuth, async (req,res,next)=>{
  try { res.json({questions: await listQuestions()}); }
  catch(e){ next(e); }
});

export default router;











