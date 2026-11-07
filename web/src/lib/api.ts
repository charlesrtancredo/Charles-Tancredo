/**
 * Cliente do backend JARVIS. O frontend NUNCA conhece chaves de API:
 * toda chamada à OpenAI/Supabase com privilégios passa pelo servidor.
 */
const BASE = import.meta.env.VITE_API_URL ?? '';

/** Mede a latência até o backend. Retorna `null` se estiver offline. */
export async function pingServer(timeoutMs = 4000): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    if (!body || body.status !== 'ok') return null;
    return Math.round(performance.now() - t0);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
