
import { Router } from 'express';
import { db } from '../data/db.js';
const router=Router();
router.get('/:qrCode',(req,res)=>{
  const qr=db.qrs.find(q=>q.qr_code===req.params.qrCode && q.is_active);
  if(!qr) return res.status(404).json({message:'QR no disponible'});
  const product=db.products.find(p=>p.id===qr.product_id);
  res.json({qr, product});
});
router.post('/:qrCode/scan',(req,res)=>{
  const qr=db.qrs.find(q=>q.qr_code===req.params.qrCode);
  db.scans.push({id:db.scans.length+1,qr_id:qr?.id,product_id:qr?.product_id,scanned_at:new Date().toISOString(),user_agent:req.headers['user-agent']});
  res.json({ok:true,message:'Escaneo registrado'});
});
export default router;
