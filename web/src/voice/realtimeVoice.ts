// Voz em tempo real com a OpenAI (WebRTC).
// Fluxo: backend emite credencial efêmera → navegador abre WebRTC direto com a OpenAI.
// A chave permanente nunca chega ao cliente.

import { createRealtimeSession } from '../lib/api';
import { LevelMeter, getMicrophone } from './audio';

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

export type RealtimePhase = 'listening' | 'user-speaking' | 'thinking' | 'speaking';

export interface RealtimeCallbacks {
  onPhase: (p: RealtimePhase) => void;
  onUserTranscript: (text: string) => void;
  onAssistantDelta: (delta: string) => void;
  onAssistantDone: (fullText: string) => void;
  onTool: (name: string, args: Record<string, unknown>) => Promise<string> | string;
  onError: (message: string) => void;
  onClose: () => void;
}

type ServerEvent = { type: string; [k: string]: unknown };

export class RealtimeVoice {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private inMeter: LevelMeter | null = null;
  private outMeter: LevelMeter | null = null;
  private phase: RealtimePhase = 'thinking';
  private transcript = '';
  private closed = false;

  constructor(private cb: RealtimeCallbacks) {}

  get connected() {
    return this.dc?.readyState === 'open';
  }

  level(): number | null {
    if (this.phase === 'speaking' && this.outMeter) return this.outMeter.level();
    return this.inMeter?.level() ?? null;
  }

  /** Conecta. `context` é enviado como mensagem de sistema com os dados atuais do usuário. */
  async connect(context: string) {
    const session = await createRealtimeSession();

    this.mic = await getMicrophone();
    this.inMeter = new LevelMeter(this.mic);

    const pc = new RTCPeerConnection();
    this.pc = pc;

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    this.audioEl = audio;
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      audio.srcObject = stream;
      audio.play().catch(() => {});
      this.outMeter?.dispose();
      this.outMeter = new LevelMeter(stream);
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && !this.closed) {
        this.cb.onError('Conexão de voz perdida.');
        this.disconnect();
      }
    };

    for (const track of this.mic.getAudioTracks()) pc.addTrack(track, this.mic);

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.onmessage = (m) => {
      try {
        this.handle(JSON.parse(m.data) as ServerEvent);
      } catch (err) {
        console.warn('[realtime] evento inválido', err);
      }
    };
    const opened = new Promise<void>((resolve, reject) => {
      dc.onopen = () => resolve();
      window.setTimeout(() => reject(new Error('datachannel_timeout')), 15_000);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const res = await fetch(CALLS_URL, {
      method: 'POST',
      body: offer.sdp,
      headers: { Authorization: `Bearer ${session.value}`, 'Content-Type': 'application/sdp' },
    });
    if (!res.ok) throw new Error(`sdp_${res.status}`);
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
    await opened;

    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'system', content: [{ type: 'input_text', text: context }] },
    });
    // Saudação falada ao abrir o canal.
    this.send({
      type: 'response.create',
      response: { instructions: 'Cumprimente o senhor em uma única frase curta, de acordo com o horário, e diga que está à disposição.' },
    });
    this.setPhase('listening');
  }

  /** Envia um comando digitado durante a sessão de voz. */
  sendText(text: string) {
    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    });
    this.send({ type: 'response.create' });
    this.setPhase('thinking');
  }

  /** Interrompe a fala atual do JARVIS. */
  interrupt() {
    this.send({ type: 'response.cancel' });
    this.send({ type: 'output_audio_buffer.clear' });
  }

  disconnect() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.dc?.close();
      this.pc?.getSenders().forEach((s) => s.track?.stop());
      this.pc?.close();
    } catch {
      /* ignorado */
    }
    this.mic?.getTracks().forEach((t) => t.stop());
    this.inMeter?.dispose();
    this.outMeter?.dispose();
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.pc = null;
    this.dc = null;
    this.cb.onClose();
  }

  private send(ev: Record<string, unknown>) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(ev));
  }

  private setPhase(p: RealtimePhase) {
    if (p === this.phase) return;
    this.phase = p;
    this.cb.onPhase(p);
  }

  private async handle(ev: ServerEvent) {
    switch (ev.type) {
      case 'input_audio_buffer.speech_started':
        this.setPhase('user-speaking');
        break;
      case 'input_audio_buffer.speech_stopped':
      case 'response.created':
        if (this.phase !== 'speaking') this.setPhase('thinking');
        break;
      case 'conversation.item.input_audio_transcription.completed': {
        const t = String(ev.transcript ?? '').trim();
        if (t) this.cb.onUserTranscript(t);
        break;
      }
      case 'output_audio_buffer.started':
        this.setPhase('speaking');
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        this.setPhase('listening');
        break;
      // Transcrição da fala do JARVIS (nomes GA e beta).
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
      case 'response.output_text.delta': {
        const d = String(ev.delta ?? '');
        this.transcript += d;
        this.cb.onAssistantDelta(d);
        break;
      }
      case 'response.done': {
        if (this.transcript.trim()) this.cb.onAssistantDone(this.transcript.trim());
        this.transcript = '';
        const output = ((ev.response as { output?: unknown[] })?.output ?? []) as {
          type: string;
          name?: string;
          call_id?: string;
          arguments?: string;
        }[];
        const calls = output.filter((o) => o.type === 'function_call');
        if (calls.length) {
          for (const c of calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(c.arguments || '{}');
            } catch {
              /* argumentos inválidos */
            }
            const result = await this.cb.onTool(c.name ?? '', args);
            this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: c.call_id, output: result } });
          }
          this.send({ type: 'response.create' });
        } else if (this.phase === 'thinking') {
          // Resposta sem áudio (ex.: cancelada): volta a ouvir.
          this.setPhase('listening');
        }
        break;
      }
      case 'error': {
        const err = ev.error as { message?: string; code?: string } | undefined;
        if (err?.code === 'response_cancel_not_active') break;
        console.warn('[realtime] erro', ev);
        this.cb.onError(err?.message ?? 'Erro na sessão de voz.');
        break;
      }
    }
  }
}
