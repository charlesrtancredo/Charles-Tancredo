import { Router } from 'express';
import { env } from '../env.js';
import { jarvisInstructions } from '../lib/persona.js';
import { realtimeTools } from '../lib/tools.js';
import { requireAuth } from '../middleware/auth.js';

export const realtime = Router();

/**
 * Emite uma credencial EFÊMERA (expira em ~1 min) para a sessão de voz em tempo real.
 * O navegador a usa apenas para abrir a conexão WebRTC com a OpenAI —
 * a chave permanente nunca sai do servidor. Persona e ferramentas também são
 * definidas aqui, fora do alcance do cliente.
 */
realtime.post('/realtime/session', requireAuth, async (req, res) => {
  if (!env.OPENAI_API_KEY) return res.status(503).json({ error: 'openai_not_configured' });

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
        instructions: jarvisInstructions(req.ownerName),
        audio: {
          input: {
            transcription: { model: env.OPENAI_TRANSCRIBE_MODEL, language: 'pt' },
            noise_reduction: { type: 'near_field' },
          },
          output: { voice: env.OPENAI_REALTIME_VOICE },
        },
        tools: realtimeTools,
        tool_choice: 'auto',
      },
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('[realtime] falha ao criar sessão', r.status, detail);
    return res.status(502).json({ error: 'upstream_error', status: r.status });
  }
  const data = (await r.json()) as { value?: string; expires_at?: number; client_secret?: { value: string; expires_at: number } };
  // Devolve apenas o necessário ao cliente.
  res.json({
    value: data.value ?? data.client_secret?.value,
    expires_at: data.expires_at ?? data.client_secret?.expires_at,
    model: env.OPENAI_REALTIME_MODEL,
  });
});
