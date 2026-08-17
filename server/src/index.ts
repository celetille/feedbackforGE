import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import feedbackRouter from './routes/feedback.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
const currentDir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(currentDir, '..', 'public');
const hasPublicAssets = existsSync(join(publicDir, 'index.html'));
const clientOrigin = process.env.CLIENT_ORIGIN ?? '*';

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/feedback', feedbackRouter);

if (hasPublicAssets) {
  app.use(express.static(publicDir));

  app.get(/^(?!\/api).*/, (request, response, next) => {
    if (request.method !== 'GET') {
      next();
      return;
    }

    response.sendFile(join(publicDir, 'index.html'));
  });
}

app.use((_request, response) => {
  response.status(404).json({ message: '接口不存在' });
});

const server = app.listen(port, host, () => {
  console.log(`Campus feedback API listening on http://${host}:${port}`);
  if (hasPublicAssets) {
    console.log(`Static web app serving from ${publicDir}`);
  }
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`${signal} received, closing server`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);