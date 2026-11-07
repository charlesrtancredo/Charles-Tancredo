import express, { type NextFunction, type Request, type Response } from 'express';
import { configured, env } from './env.js';
import { health } from './routes/health.js';
import { realtime } from './routes/realtime.js';

const app = express();
const allowed = new Set(env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean));

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Cabeçalhos de segurança básicos + CORS restrito às origens autorizadas.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
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

app.use('/api', health);
app.use('/api', realtime);

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(env.PORT, () => {
  console.log(`JARVIS backend em http://localhost:${env.PORT}`);
  console.log(`  OpenAI:   ${configured.openai ? 'configurada' : 'ausente'}`);
  console.log(`  Supabase: ${configured.supabase ? 'configurado' : 'ausente'}`);
});
