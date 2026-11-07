import type { NextFunction, Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import { env } from '../env.js';
import { supabase } from '../lib/supabase.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

/**
 * Exige um JWT válido do Supabase Auth (header `Authorization: Bearer <token>`).
 * Se OWNER_EMAIL estiver definido, apenas esse usuário é aceito.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sb = supabase();
  if (!sb) return res.status(503).json({ error: 'auth_not_configured' });

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'missing_token' });

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'invalid_token' });

  if (env.OWNER_EMAIL && data.user.email?.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'forbidden' });
  }
  req.user = data.user;
  next();
}
