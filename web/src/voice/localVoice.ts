// Voz local do dispositivo (Web Speech API): reconhecimento + síntese em pt-BR.
// Funciona sem servidor e sem chaves; usada como alternativa à voz em tempo real.

import { LevelMeter, getMicrophone } from './audio';

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const localVoiceSupport = {
  recognition: () => recognitionCtor() !== null,
  synthesis: () => 'speechSynthesis' in window,
};

// Preferência por vozes masculinas em pt-BR (JARVIS), depois qualquer pt-BR.
const PREFERRED = [/felipe/i, /daniel/i, /ricardo/i, /antonio|antônio/i, /google português do brasil/i, /francisca|thalita/i, /luciana/i];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const pt = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('pt-br'));
  for (const re of PREFERRED) {
    const v = pt.find((x) => re.test(x.name));
    if (v) return v;
  }
  return pt[0] ?? voices.find((v) => v.lang?.toLowerCase().startsWith('pt')) ?? null;
}

export interface LocalVoiceCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  /** Fim da escuta sem frase reconhecida. */
  onNoSpeech: (reason: string) => void;
}

export class LocalVoice {
  private rec: Recognition | null = null;
  private meter: LevelMeter | null = null;
  private stream: MediaStream | null = null;
  private gotFinal = false;
  private speakTimer = 0;

  constructor(private cb: LocalVoiceCallbacks) {
    // Carrega a lista de vozes (assíncrona em alguns navegadores).
    window.speechSynthesis?.getVoices();
  }

  /** Nível do microfone (0..1) ou null se não houver captura ativa. */
  level(): number | null {
    return this.meter ? this.meter.level() : null;
  }

  async listen() {
    this.stopListening();
    const Ctor = recognitionCtor();
    if (!Ctor) throw new Error('recognition_unsupported');
    window.speechSynthesis?.cancel();

    // Medidor de nível para a animação (não essencial: ignora falhas).
    try {
      this.stream = await getMicrophone();
      this.meter = new LevelMeter(this.stream);
    } catch {
      this.meter = null;
    }

    const rec = new Ctor();
    this.rec = rec;
    this.gotFinal = false;
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final.trim()) {
        this.gotFinal = true;
        this.cb.onFinal(final.trim());
        rec.stop();
      } else if (interim) {
        this.cb.onInterim(interim);
      }
    };
    rec.onerror = (e) => {
      if (!this.gotFinal) this.cb.onNoSpeech(e.error);
      this.gotFinal = true; // evita duplo aviso no onend
    };
    rec.onend = () => {
      if (!this.gotFinal) this.cb.onNoSpeech('no-speech');
      this.releaseMic();
      if (this.rec === rec) this.rec = null;
    };
    rec.start();
  }

  stopListening() {
    if (this.rec) {
      this.gotFinal = true;
      this.rec.onend = null;
      this.rec.abort();
      this.rec = null;
    }
    this.releaseMic();
  }

  private releaseMic() {
    this.meter?.dispose();
    this.meter = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /** Fala o texto em pt-BR. Resolve quando termina (ou é cancelado). */
  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 1.05;
      u.pitch = 0.9;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(this.speakTimer);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      // Salvaguarda: alguns navegadores não disparam onend.
      this.speakTimer = window.setTimeout(finish, 2500 + text.length * 90);
      synth.speak(u);
    });
  }

  cancelSpeech() {
    window.clearTimeout(this.speakTimer);
    window.speechSynthesis?.cancel();
  }

  dispose() {
    this.stopListening();
    this.cancelSpeech();
  }
}
