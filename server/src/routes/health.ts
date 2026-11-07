import { Router } from 'express';
import { configured } from '../env.js';

export const health = Router();

health.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), services: configured });
});
