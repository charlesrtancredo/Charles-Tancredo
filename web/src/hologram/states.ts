import type { AssistantState } from '../state/types';

/** Parâmetros visuais interpolados suavemente entre os estados do JARVIS. */
export interface VisualParams {
  color: [number, number, number];
  accent: [number, number, number];
  accentMix: number;
  coreAmp: number;
  coreFreq: number;
  coreIntensity: number;
  ringSpeed: number;
  ringScale: number;
  ringOpacity: number;
  spin: number;
  swirl: number;
  particleScale: number;
  pulseRate: number;
  pulseDepth: number;
  glow: number;
  wave: number;
  bloom: number;
  rigSpin: number;
}

const hex = (h: number): [number, number, number] => [
  ((h >> 16) & 255) / 255,
  ((h >> 8) & 255) / 255,
  (h & 255) / 255,
];

export const STATE_PARAMS: Record<AssistantState, VisualParams> = {
  // Aguardando: respiração lenta, rotação serena.
  idle: {
    color: hex(0x2bd9ff),
    accent: hex(0x0a5bff),
    accentMix: 0.8,
    coreAmp: 0.05,
    coreFreq: 1.6,
    coreIntensity: 1.0,
    ringSpeed: 1,
    ringScale: 1,
    ringOpacity: 0.85,
    spin: 1,
    swirl: 0,
    particleScale: 1,
    pulseRate: 0.55,
    pulseDepth: 0.06,
    glow: 0.55,
    wave: 0.06,
    bloom: 0.95,
    rigSpin: 0.06,
  },
  // Ouvindo: anéis se contraem e o núcleo reage ao nível de áudio.
  listening: {
    color: hex(0x5ef2ff),
    accent: hex(0x2aa8ff),
    accentMix: 0.6,
    coreAmp: 0.09,
    coreFreq: 2.2,
    coreIntensity: 1.25,
    ringSpeed: 1.8,
    ringScale: 0.93,
    ringOpacity: 1,
    spin: 1.6,
    swirl: 0,
    particleScale: 0.9,
    pulseRate: 1.4,
    pulseDepth: 0.04,
    glow: 0.8,
    wave: 0.9,
    bloom: 1.15,
    rigSpin: 0.04,
  },
  // Pensando: rotação acelerada, partículas em espiral para o núcleo, acento dourado.
  thinking: {
    color: hex(0x3aa0ff),
    accent: hex(0xffc15e),
    accentMix: 0.75,
    coreAmp: 0.14,
    coreFreq: 3.2,
    coreIntensity: 1.15,
    ringSpeed: 5.5,
    ringScale: 1.0,
    ringOpacity: 1,
    spin: 4.2,
    swirl: 1,
    particleScale: 1.05,
    pulseRate: 2.6,
    pulseDepth: 0.03,
    glow: 0.7,
    wave: 0.2,
    bloom: 1.1,
    rigSpin: 0.22,
  },
  // Falando: pulsos sincronizados com a fala, onda circular intensa.
  speaking: {
    color: hex(0x7af6ff),
    accent: hex(0x1d7bff),
    accentMix: 0.7,
    coreAmp: 0.07,
    coreFreq: 1.9,
    coreIntensity: 1.35,
    ringSpeed: 1.4,
    ringScale: 1.04,
    ringOpacity: 1,
    spin: 1.3,
    swirl: 0,
    particleScale: 1.08,
    pulseRate: 0.9,
    pulseDepth: 0.03,
    glow: 1,
    wave: 1.2,
    bloom: 1.3,
    rigSpin: 0.05,
  },
};

export function lerpParams(cur: VisualParams, target: VisualParams, k: number) {
  for (const key of Object.keys(target) as (keyof VisualParams)[]) {
    const t = target[key];
    if (Array.isArray(t)) {
      const c = cur[key] as [number, number, number];
      c[0] += (t[0] - c[0]) * k;
      c[1] += (t[1] - c[1]) * k;
      c[2] += (t[2] - c[2]) * k;
    } else {
      (cur[key] as number) += (t - (cur[key] as number)) * k;
    }
  }
}

export function cloneParams(p: VisualParams): VisualParams {
  return { ...p, color: [...p.color], accent: [...p.accent] };
}
