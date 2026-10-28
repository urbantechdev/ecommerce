import express from 'express';
import cors from 'cors';
import { apiRouter } from '../server/routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'UP',
    system: 'Naisiae ERP',
    company: 'Naisia Textiles',
    domain: 'naisiaetextiles.com',
    timestamp: new Date().toISOString(),
  });
});

// Mount API router on both /api and root to handle any Vercel rewrite prefix variations
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
