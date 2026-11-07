import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { configured, env } from './env.js';
import { health } from './routes/health.js';
import { realtime } from './routes/realtime.js';

const app = express();
const allowed = new Set(env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean));

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Cabeçalhos de segurança + CORS restrito às origens autorizadas.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Limite simples de requisições por IP nas rotas da API (protege créditos da OpenAI).
const hits = new Map<string, { n: number; reset: number }>();
app.use('/api', (req, res, next) => {
  const key = req.ip ?? 'anon';
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + 60_000 });
  else if (++h.n > 60) return res.status(429).json({ error: 'rate_limited' });
  next();
});

app.use('/api', health);
app.use('/api', realtime);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// Em produção, o mesmo servidor entrega o PWA compilado (mesma origem, HTTPS do host).
const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (existsSync(webDist)) {
  app.use(
    express.static(webDist, {
      index: false,
      setHeaders: (res, path) => {
        if (/(sw\.js|workbox-.*\.js|index\.html|manifest\.webmanifest)$/.test(path)) res.setHeader('Cache-Control', 'no-cache');
        else if (path.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: webDist });
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(env.PORT, () => {
  console.log(`JARVIS backend em http://localhost:${env.PORT}`);
  console.log(`  OpenAI:          ${configured.openai ? 'configurada' : 'ausente'}`);
  console.log(`  Código de acesso: ${configured.accessCode ? 'configurado' : 'ausente'}`);
  console.log(`  Supabase:        ${configured.supabase ? 'configurado' : 'ausente'}`);
  console.log(`  PWA estático:    ${existsSync(webDist) ? webDist : 'não compilado'}`);
});
