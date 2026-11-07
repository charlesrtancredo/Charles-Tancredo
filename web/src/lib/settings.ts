import { useSyncExternalStore } from 'react';

export type VoiceMode = 'auto' | 'realtime' | 'local' | 'demo';

export interface Settings {
  /** Motor de voz preferido. "auto" escolhe o melhor disponível. */
  voiceMode: VoiceMode;
  /** URL do backend (vazio = mesma origem / proxy do Vite). */
  serverUrl: string;
  /** Código de acesso pessoal definido no servidor (ACCESS_CODE). */
  accessCode: string;
  /** Falar as respostas em voz alta no modo local. */
  speakReplies: boolean;
}

const KEY = 'jarvis.settings.v1';
const DEFAULTS: Settings = { voiceMode: 'auto', serverUrl: '', accessCode: '', speakReplies: true };

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getSettings() {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* armazenamento indisponível (modo privado) — mantém só em memória */
  }
  listeners.forEach((l) => l());
}

export function useSettings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSettings,
    getSettings,
  );
}
