// Utilitários de áudio compartilhados (Web Audio API).

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

export function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor: AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioCtor }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

/** Deve ser chamado dentro de um gesto do usuário (toque) — exigência do iOS. */
export async function unlockAudio() {
  const c = audioContext();
  if (c.state === 'suspended') await c.resume().catch(() => {});
  // Prepara a síntese de voz no iOS, que só fala após um gesto.
  if ('speechSynthesis' in window && !primed) {
    primed = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}
let primed = false;

export async function getMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('mic_unsupported');
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

/** Mede o nível (0..1) de um MediaStream para animar o núcleo. */
export class LevelMeter {
  private src: MediaStreamAudioSourceNode;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private smooth = 0;

  constructor(stream: MediaStream) {
    const c = audioContext();
    this.src = c.createMediaStreamSource(stream);
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.src.connect(this.analyser);
  }

  level(): number {
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    const v = Math.min(1, Math.pow(rms * 5.5, 0.8));
    this.smooth = v > this.smooth ? v : this.smooth * 0.9 + v * 0.1;
    return this.smooth;
  }

  dispose() {
    try {
      this.src.disconnect();
    } catch {
      /* já desconectado */
    }
  }
}
