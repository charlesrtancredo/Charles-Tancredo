import { STATE_LABEL, type AssistantState } from '../state/types';
import { ReactorLogo } from './icons';
import { useNow } from './useNow';

export function TopBar({ state }: { state: AssistantState }) {
  const now = new Date(useNow(1000));
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sec = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return (
    <header className="topbar">
      <div className="brand">
        <ReactorLogo size={30} />
        <div>
          <h1>J.A.R.V.I.S.</h1>
          <small>Just A Rather Very Intelligent System</small>
        </div>
      </div>
      <div className="topbar__date">{date}</div>
      <div className="topbar__right">
        <span className={`status-pill s-${state}`}>
          <i />
          {STATE_LABEL[state]}
        </span>
        <span className="clock mono">
          {time}
          <em>{sec}</em>
        </span>
      </div>
    </header>
  );
}
