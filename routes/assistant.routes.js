
import { Router } from 'express';
import { db } from '../data/db.js';
const router=Router();
router.post('/ask',(req,res)=>{
  const {productSlug, question, sessionId}=req.body;
  const q=(question||'').toLowerCase();
  let answer='Buena pregunta. Para recomendarte mejor necesito saber tamaño del jardín, presión disponible y si quieres riego manual o automático.';
  if(q.includes('instalar')||q.includes('necesito')||q.includes('accesorios')) answer='Para instalarlo bien te recomiendo: boquilla ajustable, conector 1/4, tubería de riego, llave de paso o filtro y programador Orbit si quieres automatizar.';
  if(q.includes('50')) answer='Para un jardín de 50 m², como base podrías considerar 4 a 6 aspersores, boquillas, conectores, tubería y un programador. La cantidad exacta depende de la forma del jardín y presión.';
  if(q.includes('programador')) answer='No es obligatorio, pero es una recomendación fuerte. El programador Orbit permite ahorrar agua, regar en horarios definidos y evitar abrir la llave manualmente.';
  if(q.includes('césped')||q.includes('cesped')) answer='Sí, este producto sirve para césped. Para mejor resultado combínalo con boquillas compatibles y revisa que la presión esté entre 20 y 50 PSI.';
  const product=db.products.find(p=>p.slug===productSlug);
  db.questions.push({id:db.questions.length+1,product_id:product?.id,session_id:sessionId,question,answer,source:'rules',created_at:new Date().toISOString()});
  res.json({answer, recommendations:[], source:'rules'});
});
export default router;
