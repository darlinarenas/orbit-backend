import { Router } from 'express';
import { getProductBySlug, addQuestion } from '../data/store.js';
const router=Router();

router.post('/ask', async (req,res,next)=>{
  try {
    const {productSlug, question, sessionId}=req.body;
    if(!question) return res.status(400).json({message:'Pregunta requerida'});
    const q=question.toLowerCase();
    let answer='Para completar la instalación revisa alcance, presión, conexión y combina el producto con accesorios compatibles como boquillas, conectores, tubería, filtro o programador según el caso.';
    if(q.includes('instalar')||q.includes('instalación')) answer='Para instalarlo: valida la presión, conecta con la conexión correcta, usa boquilla/conector compatible, prueba cobertura y revisa el video de instalación de la ficha.';
    if(q.includes('césped')||q.includes('cesped')) answer='Sí, puede servir para césped si el alcance y la presión coinciden con el área. Revisa la ficha técnica y completa con boquilla, tubería y filtro.';
    if(q.includes('programador')) answer='No siempre es obligatorio, pero es muy recomendable para automatizar horarios y ahorrar agua.';
    const product=await getProductBySlug(productSlug, false);
    await addQuestion({product_id:product?.id,session_id:sessionId,question,answer,source:'rules'});
    res.json({answer,source:'rules'});
  } catch(e){ next(e); }
});
export default router;
