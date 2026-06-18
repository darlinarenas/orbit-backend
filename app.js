
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import publicRoutes from './routes/public.routes.js';
import qrRoutes from './routes/qr.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy:false }));
app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req,res)=>res.json({ok:true, app:'Orbit Assistant API'}));
app.use('/api/public', publicRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/admin', adminRoutes);

app.use((req,res)=>res.status(404).json({message:'Ruta no encontrada'}));
export default app;
