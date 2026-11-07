import { useEffect, useState, type ReactNode } from 'react';
import { AGENDA, FINANCE, LIFE_AREAS, TASKS, fmtBRL, fmtTime, isSameDay } from '../data/mock';
import type { AssistantState, ModuleId } from '../state/types';
import { Radar, Ring, SegBar, Sparkline } from './charts';
import { useNow } from './useNow';

export function HudPanel({
  title,
  code,
  children,
  onOpen,
  className = '',
}: {
  title: string;
  code: string;
  children: ReactNode;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <section className={`hud-panel ${className}`}>
      <header className="hud-panel__head">
        <span className="hud-panel__title">{title}</span>
        <span className="hud-panel__code">{code}</span>
        {onOpen && (
          <button className="hud-panel__open" onClick={onOpen} aria-label={`Abrir ${title}`}>
            ›
          </button>
        )}
      </header>
      <div className="hud-panel__body">{children}</div>
    </section>
  );
}

type WidgetProps = { onOpen?: (m: ModuleId) => void };

// ---------------- Sistema ----------------

export function SystemWidget({ state, fps, latency }: { state: AssistantState; fps: number; latency: number | null }) {
  const now = useNow(1000);
  const [start] = useState(() => Date.now());
  const [load, setLoad] = useState<number[]>(() => Array.from({ length: 40 }, () => 20 + Math.random() * 15));
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  useEffect(() => {
    const target = { idle: 22, listening: 48, thinking: 86, speaking: 61 }[state];
    setLoad((l) => [...l.slice(1), Math.max(4, Math.min(99, target + (Math.random() - 0.5) * 18))]);
  }, [now, state]);

  const up = Math.floor((now - start) / 1000);
  const upTxt = `${String(Math.floor(up / 3600)).padStart(2, '0')}:${String(Math.floor((up % 3600) / 60)).padStart(2, '0')}:${String(up % 60).padStart(2, '0')}`;
  const cur = Math.round(load[load.length - 1]);

  return (
    <HudPanel title="Sistema" code="SYS-01">
      <div className="kv">
        <span>Carga do núcleo</span>
        <b className="mono">{cur}%</b>
      </div>
      <SegBar value={cur} />
      <Sparkline data={load} height={40} accent={state === 'thinking'} />
      <div className="kv-grid">
        <div>
          <small>Render</small>
          <b className="mono">{fps || '--'} fps</b>
        </div>
        <div>
          <small>Sessão</small>
          <b className="mono">{upTxt}</b>
        </div>
        <div>
          <small>Rede</small>
          <b className={`mono ${online ? 'ok' : 'bad'}`}>{online ? 'Online' : 'Offline'}</b>
        </div>
        <div>
          <small>Servidor</small>
          <b className={`mono ${latency !== null ? 'ok' : 'dim'}`}>{latency !== null ? `${latency} ms` : 'Offline'}</b>
        </div>
      </div>
    </HudPanel>
  );
}

// ---------------- Agenda ----------------

export function AgendaWidget({ onOpen, limit = 3 }: WidgetProps & { limit?: number }) {
  const now = useNow(30_000);
  const nowD = new Date(now);
  const events = AGENDA.filter((e) => isSameDay(e.start, nowD) && e.start.getTime() + e.durationMin * 60_000 > now).slice(0, limit);
  return (
    <HudPanel title="Agenda" code="AGD-02" onOpen={() => onOpen?.('agenda')}>
      {events.length === 0 && <p className="muted">Sem compromissos restantes hoje.</p>}
      <ul className="timeline">
        {events.map((e) => {
          const live = e.start.getTime() <= now;
          return (
            <li key={e.id} className={live ? 'live' : ''}>
              <span className="mono t">{fmtTime(e.start)}</span>
              <span className="dot" />
              <span className="ttl">
                {e.title}
                {e.place && <small>{e.place}</small>}
              </span>
            </li>
          );
        })}
      </ul>
    </HudPanel>
  );
}

// ---------------- Tarefas ----------------

export function TasksWidget({ onOpen }: WidgetProps) {
  const done = TASKS.filter((t) => t.done).length;
  const pct = Math.round((done / TASKS.length) * 100);
  const open = TASKS.filter((t) => !t.done).slice(0, 3);
  return (
    <HudPanel title="Tarefas" code="TSK-03" onOpen={() => onOpen?.('tasks')}>
      <div className="row gap">
        <Ring value={pct} label={`${pct}%`} />
        <ul className="mini-list">
          {open.map((t) => (
            <li key={t.id}>
              <i className={`prio ${t.priority}`} />
              {t.title}
            </li>
          ))}
        </ul>
      </div>
    </HudPanel>
  );
}

// ---------------- Finanças ----------------

export function FinanceWidget({ onOpen }: WidgetProps) {
  const pct = Math.round((FINANCE.monthExpense / FINANCE.budget) * 100);
  return (
    <HudPanel title="Finanças" code="FIN-04" onOpen={() => onOpen?.('finance')}>
      <div className="big-number mono">{fmtBRL(FINANCE.balance)}</div>
      <small className="muted">Saldo disponível · 30 dias</small>
      <Sparkline data={FINANCE.history} height={38} />
      <div className="kv">
        <span>Orçamento do mês</span>
        <b className="mono">{pct}%</b>
      </div>
      <SegBar value={pct} warn={90} />
    </HudPanel>
  );
}

// ---------------- Estratégia ----------------

export function StrategyWidget({ onOpen }: WidgetProps) {
  const avg = Math.round(LIFE_AREAS.reduce((s, a) => s + a.score, 0) / LIFE_AREAS.length);
  return (
    <HudPanel title="Plano de vida" code="STR-05" onOpen={() => onOpen?.('strategy')}>
      <div className="radar-wrap">
        <Radar items={LIFE_AREAS} size={190} />
      </div>
      <div className="kv">
        <span>Índice de equilíbrio</span>
        <b className="mono">{avg}/100</b>
      </div>
    </HudPanel>
  );
}

// ---------------- Cartões compactos (iPhone) ----------------

export function CompactCards({ onOpen, fps, state }: WidgetProps & { fps: number; state: AssistantState }) {
  const now = useNow(30_000);
  const nowD = new Date(now);
  const next = AGENDA.find((e) => isSameDay(e.start, nowD) && e.start.getTime() > now);
  const openTasks = TASKS.filter((t) => !t.done).length;
  const pct = Math.round((FINANCE.monthExpense / FINANCE.budget) * 100);
  const avg = Math.round(LIFE_AREAS.reduce((s, a) => s + a.score, 0) / LIFE_AREAS.length);
  const load = { idle: 22, listening: 48, thinking: 86, speaking: 61 }[state];

  const cards: { id: ModuleId; label: string; value: string; sub: string }[] = [
    { id: 'agenda', label: 'Próximo', value: next ? fmtTime(next.start) : '—', sub: next?.title ?? 'Agenda livre' },
    { id: 'finance', label: 'Saldo', value: fmtBRL(FINANCE.balance, { maximumFractionDigits: 0 }), sub: `${pct}% do orçamento` },
    { id: 'tasks', label: 'Tarefas', value: String(openTasks), sub: 'em aberto' },
    { id: 'strategy', label: 'Equilíbrio', value: `${avg}`, sub: 'índice de vida' },
    { id: 'commands', label: 'Núcleo', value: `${load}%`, sub: `${fps || '--'} fps` },
  ];
  return (
    <div className="cards" role="list">
      {cards.map((c) => (
        <button key={c.id} className="card" role="listitem" onClick={() => onOpen?.(c.id)}>
          <small>{c.label}</small>
          <b className="mono">{c.value}</b>
          <span>{c.sub}</span>
        </button>
      ))}
    </div>
  );
}
