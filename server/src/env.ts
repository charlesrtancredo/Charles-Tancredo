import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  ACCESS_CODE: z.string().min(12, 'ACCESS_CODE deve ter ao menos 12 caracteres').optional().or(z.literal('').transform(() => undefined)),
  OWNER_NAME: z.string().default('Charles'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime'),
  OPENAI_REALTIME_VOICE: z.string().default('cedar'),
  OPENAI_TRANSCRIBE_MODEL: z.string().default('gpt-4o-mini-transcribe'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OWNER_EMAIL: z.string().optional(),
});

export const env = schema.parse(process.env);

export const configured = {
  openai: Boolean(env.OPENAI_API_KEY),
  supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  accessCode: Boolean(env.ACCESS_CODE),
};
