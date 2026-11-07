import { getSettings } from './settings';

/**
 * Cliente do backend JARVIS. O frontend NUNCA conhece chaves de API permanentes:
 * toda chamada à OpenAI/Supabase com privilégios passa pelo servidor.
 */
export function apiBase() {
  const s = getSettings().serverUrl.trim().replace(/\/+$/, '');
  return s || (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
}

export interface ServerInfo {
  latency: number;
  services: { openai: boolean; supabase: boolean; accessCode?: boolean };
}

/** Mede a latência até o backend. Retorna `null` se estiver offline. */
export async function pingServer(timeoutMs = 4000): Promise<ServerInfo | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(`${apiBase()}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    if (!body || body.status !== 'ok') return null;
    return { latency: Math.round(performance.now() - t0), services: body.services ?? { openai: false, supabase: false } };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

/** Solicita ao backend uma credencial efêmera para a sessão de voz em tempo real. */
export async function createRealtimeSession(): Promise<{ value: string; model: string }> {
  const { accessCode } = getSettings();
  const res = await fetch(`${apiBase()}/api/realtime/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessCode}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.value) throw new ApiError(body.error ?? 'unknown_error', res.status);
  return body;
}
