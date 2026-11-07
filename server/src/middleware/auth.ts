import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import { env } from '../env.js';
import { supabase } from '../lib/supabase.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    ownerName?: string;
  }
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Autenticação pessoal. Aceita, em ordem:
 *  1. `ACCESS_CODE` — código pessoal definido no .env (simples, ideal para uso individual);
 *  2. JWT do Supabase Auth — restrito ao `OWNER_EMAIL`, se definido.
 * Header: `Authorization: Bearer <código ou token>`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'missing_token' });

  if (env.ACCESS_CODE && safeEqual(token, env.ACCESS_CODE)) {
    req.ownerName = env.OWNER_NAME;
    return next();
  }

  const sb = supabase();
  if (!sb) {
    return res.status(env.ACCESS_CODE ? 401 : 503).json({ error: env.ACCESS_CODE ? 'invalid_token' : 'auth_not_configured' });
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'invalid_token' });
  if (env.OWNER_EMAIL && data.user.email?.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'forbidden' });
  }
  req.user = data.user;
  req.ownerName = (data.user.user_metadata?.name as string | undefined) ?? env.OWNER_NAME;
  next();
}
