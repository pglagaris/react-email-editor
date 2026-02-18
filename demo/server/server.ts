import express from 'express';
import cors from 'cors';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

import designRoutes from './routes/designs';
import folderRoutes from './routes/folders';
import tagRoutes from './routes/tags';
import searchRoutes from './routes/search';

const app = express();
const PORT = process.env.API_PORT || 3001;
const PARCEL_PORT = process.env.PARCEL_PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Unlayer designs can be large

// API routes
app.use('/api/designs', designRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy everything else to Parcel dev server
app.use(
  '/',
  createProxyMiddleware({
    target: `http://localhost:${PARCEL_PORT}`,
    changeOrigin: true,
    ws: true, // proxy WebSocket for HMR
  })
);

app.listen(PORT, () => {
  console.log(`📧 Email Editor running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Frontend proxied from Parcel on port ${PARCEL_PORT}`);
  console.log(`   Database: ${path.join(__dirname, '..', 'data', 'email-editor.db')}`);
});

export default app;
