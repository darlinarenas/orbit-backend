import app from './app.js';
const PORT=process.env.PORT||4000;
app.listen(PORT,()=>console.log(`Orbit Assistant API en http://localhost:${PORT}`));
