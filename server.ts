import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cross-Origin Isolation & Google Auth Popup Policy
  // Allows Firebase Google Auth popup window (naisiae-erp.firebaseapp.com) to postMessage credentials back to opener
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
  });

  // Search Engine Crawler Policy (Block Admin, Cashier, Accountant, ERP, and API from crawling)
  app.use((req, res, next) => {
    const rawPath = req.path.toLowerCase();
    const isDisallowedArea =
      rawPath.startsWith('/erp') ||
      rawPath.startsWith('/admin') ||
      rawPath.startsWith('/login') ||
      rawPath.startsWith('/cashier') ||
      rawPath.startsWith('/accountant') ||
      rawPath.startsWith('/pos') ||
      rawPath.startsWith('/dashboard') ||
      rawPath.startsWith('/inventory') ||
      rawPath.startsWith('/financials') ||
      rawPath.startsWith('/invoices') ||
      rawPath.startsWith('/quotations') ||
      rawPath.startsWith('/receipts') ||
      rawPath.startsWith('/purchases') ||
      rawPath.startsWith('/expenses') ||
      rawPath.startsWith('/transfers') ||
      rawPath.startsWith('/users') ||
      rawPath.startsWith('/audit') ||
      rawPath.startsWith('/settings') ||
      rawPath.startsWith('/api');

    if (isDisallowedArea) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    } else {
      res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large');
    }
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'Naisiae ERP',
      company: 'Naisia Textiles',
      domain: 'naisiaetextiles.com',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Vite middleware for dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Naisiae ERP] Mounted Vite dev middleware successfully');
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Naisiae ERP Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Naisiae ERP Server] Multi-branch enterprise synchronization active.`);
  });
}

startServer().catch((err) => {
  console.error('[Naisiae ERP Server] Failed to start server:', err);
  process.exit(1);
});
