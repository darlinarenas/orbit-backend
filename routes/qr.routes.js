import { Router } from 'express';
import { getQrByCode, getProductById, addScan } from '../data/store.js';
const router=Router();

router.get('/:qrCode', async (req,res,next)=>{
  try {
    const qr = await getQrByCode(req.params.qrCode);
    if(!qr) return res.status(404).json({message:'QR no disponible'});
    const product = await getProductById(qr.product_id);
    res.json({qr, product});
  } catch(e){ next(e); }
});

router.post('/:qrCode/scan', async (req,res,next)=>{
  try {
    const qr = await getQrByCode(req.params.qrCode);
    await addScan({qr_id:qr?.id,product_id:qr?.product_id,user_agent:req.headers['user-agent']});
    res.json({ok:true,message:'Escaneo registrado'});
  } catch(e){ next(e); }
});
export default router;
