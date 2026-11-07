import { Router } from 'express';
import { env } from '../env.js';
import { jarvisInstructions } from '../lib/persona.js';
import { requireAuth } from '../middleware/auth.js';

export const realtime = Router();

/**
 * Emite uma credencial EFÊMERA para a sessão de voz em tempo real.
 * O navegador usa essa credencial de curta duração para abrir a conexão WebRTC
 * com a OpenAI — a chave permanente nunca sai do servidor.
 *
 * Fase 2: este endpoint será consumido pelo frontend. Modelo e voz são configuráveis via .env.
 */
realtime.post('/realtime/session', requireAuth, async (req, res) => {
  if (!env.OPENAI_API_KEY) return res.status(503).json({ error: 'openai_not_configured' });

  const ownerName = (req.user?.user_metadata?.name as string | undefined) ?? 'senhor';
  const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: env.OPENAI_REALTIME_MODEL,
        instructions: jarvisInstructions(ownerName),
        audio: { output: { voice: env.OPENAI_REALTIME_VOICE } },
      },
    }),
  });

  if (!r.ok) {
    console.error('[realtime] falha ao criar sessão', r.status, await r.text().catch(() => ''));
    return res.status(502).json({ error: 'upstream_error' });
  }
  res.json(await r.json());
});
