import { useCallback, useEffect, useRef, useState } from 'react';
import { buildVoiceContext } from '../data/context';
import { greeting, think } from '../data/demoBrain';
import { ApiError, type ServerInfo } from '../lib/api';
import { getSettings, type Settings } from '../lib/settings';
import { unlockAudio } from '../voice/audio';
import { LocalVoice, localVoiceSupport } from '../voice/localVoice';
import { RealtimeVoice } from '../voice/realtimeVoice';
import type { AssistantState, ChatMessage, ModuleId } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

export type VoiceEngine = 'realtime' | 'local' | 'demo';
export type ConnStatus = 'off' | 'connecting' | 'on';

const DEMO_PHRASES = [
  'Jarvis, como está minha agenda hoje?',
  'Qual é a situação das minhas finanças?',
  'Quais tarefas estão pendentes?',
  'Me dê uma análise do meu plano estratégico.',
];

const MODULE_IDS: ModuleId[] = ['voice', 'finance', 'agenda', 'tasks', 'strategy', 'memory', 'commands'];

/** Decide qual motor de voz usar conforme preferências e disponibilidade. */
export function resolveEngine(s: Settings, server: ServerInfo | null): VoiceEngine {
  const localOk = localVoiceSupport.recognition();
  switch (s.voiceMode) {
    case 'realtime':
      return 'realtime';
    case 'local':
      return localOk ? 'local' : 'demo';
    case 'demo':
      return 'demo';
    default:
      if (server?.services.openai && s.accessCode) return 'realtime';
      return localOk ? 'local' : 'demo';
  }
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return 'Código de acesso inválido. Verifique em Configurações, senhor.';
    if (err.code === 'openai_not_configured') return 'A chave da OpenAI ainda não foi configurada no servidor.';
    if (err.code === 'auth_not_configured') return 'Defina ACCESS_CODE no servidor para liberar a voz em tempo real.';
    if (err.status === 429) return 'Muitas solicitações. Aguarde um instante, senhor.';
    return `Falha no servidor de voz (${err.code}).`;
  }
  const name = (err as { name?: string })?.name;
  const msg = (err as { message?: string })?.message ?? '';
  if (name === 'NotAllowedError' || msg === 'not-allowed') return 'Permissão do microfone negada. Autorize o acesso nos ajustes do Safari.';
  if (name === 'NotFoundError') return 'Nenhum microfone encontrado.';
  if (msg === 'mic_unsupported') return 'Este navegador não permite captura de áudio (é necessário HTTPS).';
  if (name === 'TypeError') return 'Servidor indisponível. Verifique o endereço em Configurações.';
  return 'Não foi possível iniciar a voz em tempo real.';
}

interface Options {
  onOpenModule?: (m: ModuleId) => void;
  onCloseModule?: () => void;
  server: ServerInfo | null;
}

/**
 * Orquestra o assistente: máquina de estados (aguardando → ouvindo → pensando → falando)
 * e três motores de voz:
 *  - realtime: OpenAI Realtime via WebRTC (credencial efêmera emitida pelo backend);
 *  - local: reconhecimento e síntese de voz do próprio dispositivo (Web Speech API);
 *  - demo: escuta simulada (navegadores sem reconhecimento de voz).
 */
export function useAssistant({ onOpenModule, onCloseModule, server }: Options) {
  const [state, setState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState('');
  const [interim, setInterim] = useState('');
  const [notice, setNoticeState] = useState('');
  const [conn, setConn] = useState<ConnStatus>('off');
  const [activeEngine, setActiveEngine] = useState<VoiceEngine | null>(null);

  const timers = useRef<number[]>([]);
  const noticeTimer = useRef(0);
  const speechToken = useRef(0);
  const demoIdx = useRef(0);
  const cbs = useRef({ onOpenModule, onCloseModule, server });
  cbs.current = { onOpenModule, onCloseModule, server };
  const stateRef = useRef(state);
  stateRef.current = state;

  const rtRef = useRef<RealtimeVoice | null>(null);
  const localRef = useRef<LocalVoice | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const pushMsg = (role: ChatMessage['role'], text: string) =>
    setMessages((m) => [...m.slice(-40), { id: uid(), role, text, at: Date.now() }]);

  const setNotice = useCallback((text: string, ms = 5000) => {
    window.clearTimeout(noticeTimer.current);
    setNoticeState(text);
    if (text && ms) noticeTimer.current = window.setTimeout(() => setNoticeState(''), ms);
  }, []);

  // ---------- Fala local (texto + síntese de voz) ----------

  const speakReply = useCallback((text: string, after?: () => void) => {
    const token = ++speechToken.current;
    setState('speaking');
    setLive('');

    const typing = new Promise<void>((resolve) => {
      const words = text.split(' ');
      let i = 0;
      const step = () => {
        if (token !== speechToken.current) return;
        i++;
        setLive(words.slice(0, i).join(' '));
        if (i < words.length) later(step, 60 + Math.random() * 70);
        else later(resolve, 600);
      };
      later(step, 200);
    });

    const s = getSettings();
    const tts =
      s.speakReplies && localVoiceSupport.synthesis()
        ? (localRef.current ??= new LocalVoice(localCallbacks.current)).speak(text)
        : Promise.resolve();

    Promise.all([typing, tts]).then(() => {
      if (token !== speechToken.current) return;
      pushMsg('jarvis', text);
      setLive('');
      setState('idle');
      after?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replyLocally = useCallback(
    (text: string) => {
      setState('thinking');
      const reply = think(text);
      later(
        () =>
          speakReply(reply.text, () => {
            // O painel abre depois da fala, para não esconder o núcleo animado.
            if (reply.openModule) later(() => cbs.current.onOpenModule?.(reply.openModule!), 300);
          }),
        900 + Math.random() * 700,
      );
    },
    [speakReply],
  );

  // ---------- Voz local ----------

  const localCallbacks = useRef({
    onInterim: (t: string) => setInterim(t),
    onFinal: (t: string) => {
      setInterim('');
      pushMsg('user', t);
      replyLocally(t);
    },
    onNoSpeech: (reason: string) => {
      setInterim('');
      setState('idle');
      if (reason === 'not-allowed' || reason === 'service-not-allowed') setNotice(describeError({ message: 'not-allowed' }));
      else if (reason !== 'aborted') setNotice('Não ouvi nada, senhor. Toque novamente para falar.', 3500);
    },
  });
  // Mantém os callbacks atualizados (replyLocally é estável, mas por segurança).
  localCallbacks.current.onFinal = (t: string) => {
    setInterim('');
    pushMsg('user', t);
    replyLocally(t);
  };

  const startDemoListening = useCallback(() => {
    setState('listening');
    const phrase = DEMO_PHRASES[demoIdx.current++ % DEMO_PHRASES.length];
    const words = phrase.split(' ');
    let i = 0;
    const step = () => {
      i++;
      setInterim(words.slice(0, i).join(' '));
      if (i < words.length) later(step, 180 + Math.random() * 160);
      else
        later(() => {
          setInterim('');
          pushMsg('user', phrase);
          replyLocally(phrase);
        }, 600);
    };
    later(step, 900);
  }, [replyLocally]);

  const startLocalListening = useCallback(async () => {
    setState('listening');
    setInterim('');
    const lv = (localRef.current ??= new LocalVoice(localCallbacks.current));
    try {
      await lv.listen();
    } catch {
      startDemoListening();
    }
  }, [startDemoListening]);

  // ---------- Voz em tempo real ----------

  const startRealtime = useCallback(async () => {
    setConn('connecting');
    setActiveEngine('realtime');
    setState('thinking');
    setNotice('Estabelecendo canal de voz seguro…', 0);

    const rt = new RealtimeVoice({
      onPhase: (p) => {
        if (p === 'listening') {
          setState('listening');
          setInterim('');
        } else if (p === 'user-speaking') {
          setState('listening');
          setInterim('…');
          setLive('');
        } else if (p === 'thinking') {
          setState('thinking');
          setLive('');
        } else setState('speaking');
      },
      onUserTranscript: (t) => {
        setInterim('');
        pushMsg('user', t);
      },
      onAssistantDelta: (d) => setLive((l) => l + d),
      onAssistantDone: (t) => pushMsg('jarvis', t),
      onTool: (name, args) => {
        if (name === 'abrir_modulo' && MODULE_IDS.includes(args.modulo as ModuleId)) {
          cbs.current.onOpenModule?.(args.modulo as ModuleId);
          return JSON.stringify({ ok: true, aberto: args.modulo });
        }
        if (name === 'fechar_painel') {
          cbs.current.onCloseModule?.();
          return JSON.stringify({ ok: true });
        }
        return JSON.stringify({ ok: false, erro: 'ferramenta desconhecida' });
      },
      onError: (m) => setNotice(m, 6000),
      onClose: () => {
        if (rtRef.current === rt) rtRef.current = null;
        setConn('off');
        setActiveEngine(null);
        setInterim('');
        setLive('');
        setState('idle');
      },
    });
    rtRef.current = rt;

    try {
      await rt.connect(buildVoiceContext());
      setConn('on');
      setNotice('Canal de voz ativo. Pode falar, senhor.', 3000);
    } catch (err) {
      console.warn('[voz] falha no tempo real', err);
      rt.disconnect();
      const msg = describeError(err);
      // Em modo automático, cai para a voz local do dispositivo.
      if (getSettings().voiceMode === 'auto' && localVoiceSupport.recognition()) {
        setNotice(`${msg} Usando a voz do dispositivo.`, 6000);
        setActiveEngine('local');
        startLocalListening();
      } else {
        setNotice(msg, 7000);
      }
    }
  }, [setNotice, startLocalListening]);

  // ---------- API pública ----------

  const stop = useCallback(() => {
    clearTimers();
    speechToken.current++;
    localRef.current?.stopListening();
    localRef.current?.cancelSpeech();
    rtRef.current?.disconnect();
    setInterim('');
    setLive('');
    setState('idle');
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      if (rtRef.current?.connected) {
        pushMsg('user', text);
        setLive('');
        rtRef.current.sendText(text);
        return;
      }
      clearTimers();
      speechToken.current++;
      localRef.current?.stopListening();
      localRef.current?.cancelSpeech();
      setInterim('');
      setLive('');
      pushMsg('user', text);
      replyLocally(text);
    },
    [replyLocally],
  );

  /** Botão do microfone / toque no núcleo. Deve ser chamado num gesto do usuário. */
  const toggleListening = useCallback(() => {
    void unlockAudio();
    if (rtRef.current) {
      rtRef.current.disconnect();
      return;
    }
    if (stateRef.current !== 'idle') {
      stop();
      return;
    }
    clearTimers();
    const engine = resolveEngine(getSettings(), cbs.current.server);
    setActiveEngine(engine);
    if (engine === 'realtime') void startRealtime();
    else if (engine === 'local') void startLocalListening();
    else startDemoListening();
  }, [stop, startRealtime, startLocalListening, startDemoListening]);

  /** Toque no núcleo: durante a fala em tempo real, interrompe o JARVIS. */
  const tapCore = useCallback(() => {
    if (rtRef.current?.connected && stateRef.current === 'speaking') {
      rtRef.current.interrupt();
      return;
    }
    toggleListening();
  }, [toggleListening]);

  /** Força um estado visual (inspeção das animações na Central de Comandos). */
  const forceState = useCallback((s: AssistantState) => {
    if (rtRef.current) return;
    clearTimers();
    speechToken.current++;
    localRef.current?.stopListening();
    localRef.current?.cancelSpeech();
    setInterim('');
    setLive(s === 'speaking' ? 'Demonstração do estado de fala, senhor.' : '');
    setState(s);
  }, []);

  const boot = useCallback(() => speakReply(greeting()), [speakReply]);

  /** Nível de áudio real para o núcleo (null = envelope simulado). */
  const getLevel = useCallback((): number | null => {
    if (rtRef.current) return rtRef.current.level();
    if (stateRef.current === 'listening') return localRef.current?.level() ?? null;
    return null;
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      rtRef.current?.disconnect();
      localRef.current?.dispose();
    },
    [],
  );

  return {
    state,
    messages,
    live,
    interim,
    notice,
    conn,
    activeEngine,
    send,
    toggleListening,
    tapCore,
    stop,
    forceState,
    boot,
    getLevel,
  };
}
