import { useState, type FormEvent } from 'react';
import type { AssistantState } from '../state/types';
import { GridIcon, MicIcon, SendIcon, StopIcon } from './icons';

interface Props {
  state: AssistantState;
  onSend: (t: string) => void;
  onMic: () => void;
  onModules: () => void;
}

export function Dock({ state, onSend, onMic, onModules }: Props) {
  const [text, setText] = useState('');
  const busy = state !== 'idle';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
    (document.activeElement as HTMLElement | null)?.blur();
  };
  return (
    <footer className="dock">
      <button className="icon-btn dock__modules" onClick={onModules} aria-label="Abrir módulos">
        <GridIcon size={22} />
      </button>
      <form className="dock__input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite um comando…"
          enterKeyHint="send"
          autoComplete="off"
          aria-label="Comando para o JARVIS"
        />
        <button type="submit" className="icon-btn" aria-label="Enviar" disabled={!text.trim()}>
          <SendIcon />
        </button>
      </form>
      <button className={`mic s-${state}`} onClick={onMic} aria-label={busy ? 'Interromper' : 'Falar com o JARVIS'}>
        <span className="mic__ring" />
        <span className="mic__ring r2" />
        {busy ? <StopIcon size={24} /> : <MicIcon size={26} />}
      </button>
    </footer>
  );
}
