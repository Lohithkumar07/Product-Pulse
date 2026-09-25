import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from './server/db.js';
import { seedDatabase } from './server/seed.js';
import { apiRouter } from './server/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize SQLite database and seed initial demo dataset if empty
  try {
    const db = await getDb();
    await seedDatabase(db);
    console.log('✓ SQLite Database initialized and seeded successfully.');
  } catch (dbErr) {
    console.error('Failed to initialize database:', dbErr);
  }

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logger in dev
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Sample CSV direct download route
  app.get('/api/sample-csv', (req, res) => {
    const samplePath = path.resolve(__dirname, 'public', 'sample-feedback.csv');
    if (fs.existsSync(samplePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sample-feedback.csv"');
      res.sendFile(samplePath);
    } else {
      res.status(404).send('Sample CSV not found');
    }
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ProductPulse Feedback Intelligence',
      timestamp: new Date().toISOString(),
      ai_enabled: !!process.env.GEMINI_API_KEY,
    });
  });

  // Static or Vite middleware
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log('Mounting Vite dev server in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`ProductPulse Server running on http://0.0.0.0:${PORT}`);
    console.log(`Backend API endpoints available under /api/*`);
    console.log(`===============================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
