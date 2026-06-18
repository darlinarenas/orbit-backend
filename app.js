
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import publicRoutes from './routes/public.routes.js';
import qrRoutes from './routes/qr.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { checkDatabaseConnection, databaseDebug } from './data/store.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy:false }));
app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', async (req,res)=>{
  const database = await checkDatabaseConnection();
  res.json({ok:true, app:'Orbit Assistant API', database});
});

app.get('/api/db-debug', async (req,res,next)=>{
  try {
    const database = await checkDatabaseConnection();
    const debug = database.connected ? await databaseDebug() : null;
    res.json({ok:true, database, debug});
  } catch (e) { next(e); }
});
app.use('/api/public', publicRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/admin', adminRoutes);

app.use((req,res)=>res.status(404).json({message:'Ruta no encontrada'}));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Error interno del servidor' });
});
export default app;
