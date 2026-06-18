import { Router } from 'express';
import {
  getProductBySlug,
  getProductById,
  recommendationsForProduct,
  getQrByCode,
  addLead,
  listProducts
} from '../data/store.js';
const router=Router();

function emptyGuide() {
  return { title:'', description:'', main_video_url:'', steps:[] };
}

router.get('/product/:slug', async (req,res,next)=>{
  try {
    const product = await getProductBySlug(req.params.slug, true);
    if(!product) return res.status(404).json({message:'Producto no encontrado'});
    res.json({product});
  } catch(e){ next(e); }
});

router.get('/product/:slug/recommendations', async (req,res,next)=>{
  try {
    const source = await getProductBySlug(req.params.slug, false);
    if(!source) return res.json({recommendations:[]});
    const rows = await recommendationsForProduct(source.id);
    const recommendations = [];
    for (const r of rows) {
      const p = await getProductById(r.recommended_product_id);
      if (p && p.is_active !== false) recommendations.push({...r, ...p, reason:r.reason, recommendation_type:r.recommendation_type});
    }
    res.json({recommendations});
  } catch(e){ next(e); }
});

router.get('/product/:slug/compatibles', async (req,res,next)=>{
  try {
    const source = await getProductBySlug(req.params.slug, false);
    if(!source) return res.json({compatibles:[]});
    const rows = await recommendationsForProduct(source.id);
    const compatibles = [];
    for (const r of rows) {
      const p = await getProductById(r.recommended_product_id);
      if (p && p.is_active !== false) compatibles.push(p);
    }
    res.json({compatibles});
  } catch(e){ next(e); }
});

router.get('/product/:slug/installation', async (req,res,next)=>{
  try {
    const product = await getProductBySlug(req.params.slug, true);
    if(!product) return res.status(404).json({message:'Producto no encontrado'});
    res.json({ guide: product.installation_guide || emptyGuide() });
  } catch(e){ next(e); }
});

router.get('/product/:slug/media', async (req,res,next)=>{
  try {
    const product = await getProductBySlug(req.params.slug, true);
    if(!product) return res.status(404).json({message:'Producto no encontrado'});
    res.json({ media: product.media || [] });
  } catch(e){ next(e); }
});

router.get('/categories', async (req,res,next)=>{
  try {
    const products = await listProducts();
    const names = [...new Set(products.map(p=>p.category_name).filter(Boolean))];
    res.json({items:names.map((name, i)=>({id:i+1, name, slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), is_active:true}))});
  } catch(e){ next(e); }
});

router.post('/leads', async (req,res,next)=>{
  try {
    const {email,name,productSlug,qrCode,source,acceptsMarketing}=req.body;
    if(!email || !acceptsMarketing) return res.status(400).json({message:'Email y aceptación de marketing son obligatorios'});
    const product=await getProductBySlug(productSlug, false);
    const qr=qrCode ? await getQrByCode(qrCode) : null;
    const lead = await addLead({email,name:name||'',product_id:product?.id,qr_id:qr?.id,source:source||'ficha_producto',accepts_marketing:!!acceptsMarketing});
    res.json({ok:true,message:'Correo registrado correctamente',lead});
  } catch(e){ next(e); }
});

export default router;
