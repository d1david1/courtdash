import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { authRoutes, requireAuth } from './auth.js';
import { statsRoutes } from './stats.js';

export function createApp({ db, clientDist, nowFn } = {}) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  authRoutes(app, db);
  statsRoutes(app, db, requireAuth, nowFn);

  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong.' });
  });

  return app;
}
