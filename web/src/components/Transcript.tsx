import type { AssistantState, ChatMessage } from '../state/types';

interface Props {
  state: AssistantState;
  live: string;
  interim: string;
  notice: string;
  inSession: boolean;
  messages: ChatMessage[];
}

export function Transcript({ state, live, interim, notice, inSession, messages }: Props) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastJarvis = [...messages].reverse().find((m) => m.role === 'jarvis');

  let user: string | undefined;
  let jarvis: string | undefined;
  let rest = false;
  let hint: string | undefined;

  if (state === 'listening') {
    if (interim) user = interim;
    else {
      jarvis = lastJarvis?.text;
      rest = true;
      hint = inSession ? 'Ouvindo · pode falar, senhor' : 'Ouvindo…';
    }
  } else if (state === 'thinking') {
    user = lastUser?.text;
  } else if (state === 'speaking') {
    user = lastUser?.text;
    jarvis = live || '…';
  } else {
    jarvis = lastJarvis?.text;
    rest = true;
    if (!jarvis) hint = 'Toque no núcleo ou no microfone para falar.';
  }

  return (
    <section className={`transcript s-${state}`} aria-live="polite">
      {notice && <p className="transcript__notice mono">{notice}</p>}
      {user && (
        <p className="transcript__user">
          <span className="who mono">VOCÊ</span>
          {user}
        </p>
      )}
      {state === 'thinking' && (
        <p className="transcript__thinking mono">
          Analisando<span className="dots" />
        </p>
      )}
      {jarvis && (
        <p className={`transcript__jarvis ${rest ? 'rest' : ''}`}>
          <span className="who mono">JARVIS</span>
          {jarvis}
          {state === 'speaking' && <span className="caret" />}
        </p>
      )}
      {hint && <p className="transcript__hint">{hint}</p>}
    </section>
  );
}
