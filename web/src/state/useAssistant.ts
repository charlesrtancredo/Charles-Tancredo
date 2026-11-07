import { useCallback, useEffect, useRef, useState } from 'react';
import { greeting, think } from '../data/demoBrain';
import type { AssistantState, ChatMessage, ModuleId } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

const DEMO_PHRASES = [
  'Jarvis, como está minha agenda hoje?',
  'Qual é a situação das minhas finanças?',
  'Quais tarefas estão pendentes?',
  'Me dê uma análise do meu plano estratégico.',
];

interface Options {
  onOpenModule?: (m: ModuleId) => void;
}

/**
 * Máquina de estados do assistente (aguardando → ouvindo → pensando → falando).
 * Nesta versão as respostas são locais; a interface já é a mesma que será usada
 * com o backend de IA em tempo real.
 */
export function useAssistant({ onOpenModule }: Options = {}) {
  const [state, setState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState(''); // texto sendo "falado" (efeito máquina de escrever)
  const [interim, setInterim] = useState(''); // transcrição parcial durante a escuta
  const timers = useRef<number[]>([]);
  const demoIdx = useRef(0);
  const openRef = useRef(onOpenModule);
  openRef.current = onOpenModule;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const speak = useCallback((text: string, after?: () => void) => {
    setState('speaking');
    setLive('');
    const words = text.split(' ');
    let i = 0;
    const step = () => {
      i++;
      setLive(words.slice(0, i).join(' '));
      if (i < words.length) later(step, 55 + Math.random() * 70);
      else
        later(() => {
          setMessages((m) => [...m, { id: uid(), role: 'jarvis', text, at: Date.now() }]);
          setLive('');
          setState('idle');
          after?.();
        }, 900);
    };
    later(step, 250);
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      clearTimers();
      setInterim('');
      setLive('');
      setMessages((m) => [...m, { id: uid(), role: 'user', text, at: Date.now() }]);
      setState('thinking');
      const reply = think(text);
      later(() => {
        // O painel do módulo abre só depois da fala, para não esconder o núcleo animado.
        speak(reply.text, () => {
          if (reply.openModule) later(() => openRef.current?.(reply.openModule!), 350);
        });
      }, 1100 + Math.random() * 900);
    },
    [speak],
  );

  /** Simula captura de voz até a integração com GPT Realtime. */
  const startListening = useCallback(() => {
    clearTimers();
    setLive('');
    setState('listening');
    const phrase = DEMO_PHRASES[demoIdx.current++ % DEMO_PHRASES.length];
    const words = phrase.split(' ');
    let i = 0;
    const step = () => {
      i++;
      setInterim(words.slice(0, i).join(' '));
      if (i < words.length) later(step, 180 + Math.random() * 160);
      else later(() => send(phrase), 700);
    };
    later(step, 900);
  }, [send]);

  const stop = useCallback(() => {
    clearTimers();
    setInterim('');
    setLive('');
    setState('idle');
  }, []);

  const toggleListening = useCallback(() => {
    if (state === 'listening' || state === 'speaking' || state === 'thinking') stop();
    else startListening();
  }, [state, startListening, stop]);

  /** Força um estado visual (para inspeção das animações na Central de Comandos). */
  const forceState = useCallback((s: AssistantState) => {
    clearTimers();
    setInterim('');
    setLive(s === 'speaking' ? 'Demonstração do estado de fala, senhor.' : '');
    setState(s);
  }, []);

  const boot = useCallback(() => {
    speak(greeting());
  }, [speak]);

  useEffect(() => clearTimers, []);

  return { state, messages, live, interim, send, toggleListening, stop, forceState, boot };
}
