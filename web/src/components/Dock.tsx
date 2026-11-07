import { useState, type FormEvent } from 'react';
import type { ConnStatus } from '../state/useAssistant';
import type { AssistantState } from '../state/types';
import { GridIcon, MicIcon, PhoneOffIcon, SendIcon, StopIcon } from './icons';

interface Props {
  state: AssistantState;
  conn: ConnStatus;
  onSend: (t: string) => void;
  onMic: () => void;
  onModules: () => void;
}

export function Dock({ state, conn, onSend, onMic, onModules }: Props) {
  const [text, setText] = useState('');
  const inCall = conn !== 'off';
  const busy = state !== 'idle';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
    (document.activeElement as HTMLElement | null)?.blur();
  };
  const label = inCall ? 'Encerrar conversa por voz' : busy ? 'Interromper' : 'Falar com o JARVIS';
  return (
    <footer className="dock">
      <button className="icon-btn dock__modules" onClick={onModules} aria-label="Abrir módulos">
        <GridIcon size={22} />
      </button>
      <form className="dock__input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={conn === 'on' ? 'Digite ou apenas fale…' : 'Digite um comando…'}
          enterKeyHint="send"
          autoComplete="off"
          aria-label="Comando para o JARVIS"
        />
        <button type="submit" className="icon-btn" aria-label="Enviar" disabled={!text.trim()}>
          <SendIcon />
        </button>
      </form>
      <button className={`mic s-${state} ${inCall ? 'in-call' : ''} c-${conn}`} onClick={onMic} aria-label={label} title={label}>
        <span className="mic__ring" />
        <span className="mic__ring r2" />
        {inCall ? <PhoneOffIcon size={26} /> : busy ? <StopIcon size={24} /> : <MicIcon size={26} />}
      </button>
    </footer>
  );
}
