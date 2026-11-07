import { useEffect, useState } from 'react';
import { AGENDA, FINANCE, LIFE_AREAS, MEMORIES, TASKS, fmtBRL, fmtTime, isSameDay, type Task } from '../data/mock';
import { STATE_LABEL, type AssistantState, type ModuleId } from '../state/types';
import type { ServerInfo } from '../lib/api';
import type { ConnStatus, VoiceEngine } from '../state/useAssistant';
import { Radar, Ring, SegBar, Sparkline } from './charts';
import { CloseIcon, MODULE_ICON } from './icons';
import { SettingsView } from './SettingsView';

export const MODULES: { id: ModuleId; name: string; desc: string; code: string }[] = [
  { id: 'voice', name: 'Assistente de voz', desc: 'Conversa natural em tempo real', code: 'VOX' },
  { id: 'finance', name: 'Finanças', desc: 'Saldo, orçamento e investimentos', code: 'FIN' },
  { id: 'agenda', name: 'Agenda', desc: 'Compromissos e blocos de foco', code: 'AGD' },
  { id: 'tasks', name: 'Tarefas', desc: 'Tarefas e lembretes', code: 'TSK' },
  { id: 'strategy', name: 'Estratégia', desc: 'Planejamento estratégico da vida', code: 'STR' },
  { id: 'memory', name: 'Memória', desc: 'Conhecimento persistente', code: 'MEM' },
  { id: 'commands', name: 'Central de comandos', desc: 'Atalhos e diagnóstico', code: 'CMD' },
];

export type SheetView = ModuleId | 'menu' | 'settings' | null;

interface Props {
  view: SheetView;
  onClose: () => void;
  onNavigate: (v: SheetView) => void;
  onCommand: (text: string) => void;
  onForceState: (s: AssistantState) => void;
  state: AssistantState;
  engine: VoiceEngine;
  conn: ConnStatus;
  server: ServerInfo | null;
  onServerChange: (s: ServerInfo | null) => void;
}

export function ModuleSheet({ view, onClose, onNavigate, onCommand, onForceState, state, engine, conn, server, onServerChange }: Props) {
  const [shown, setShown] = useState<SheetView>(view);
  useEffect(() => {
    if (view) setShown(view);
  }, [view]);

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, onClose]);

  const mod =
    shown === 'settings' ? { id: 'settings', name: 'Configurações', code: 'CFG' } : MODULES.find((m) => m.id === shown);
  const open = view !== null;

  return (
    <div className={`sheet-backdrop ${open ? 'open' : ''}`} onClick={onClose} aria-hidden={!open}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={mod?.name ?? 'Módulos'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grabber" />
        <header className="sheet__head">
          {shown !== 'menu' && (
            <button className="link" onClick={() => onNavigate('menu')}>
              ‹ Módulos
            </button>
          )}
          <h2>
            {mod ? mod.name : 'Módulos'}
            <span className="code">{mod ? `MOD-${mod.code}` : 'J.A.R.V.I.S.'}</span>
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </header>
        <div className="sheet__body">
          {shown === 'menu' && <MenuView onNavigate={onNavigate} />}
          {shown === 'finance' && <FinanceView />}
          {shown === 'agenda' && <AgendaView />}
          {shown === 'tasks' && <TasksView />}
          {shown === 'strategy' && <StrategyView />}
          {shown === 'memory' && <MemoryView />}
          {shown === 'voice' && <VoiceView state={state} onForceState={onForceState} engine={engine} conn={conn} onNavigate={onNavigate} />}
          {shown === 'settings' && <SettingsView server={server} onServerChange={onServerChange} />}
          {shown === 'commands' && <CommandsView onCommand={onCommand} onForceState={onForceState} state={state} />}
        </div>
      </div>
    </div>
  );
}

function MenuView({ onNavigate }: { onNavigate: (v: SheetView) => void }) {
  return (
    <div className="module-grid">
      {MODULES.map((m, i) => {
        const Icon = MODULE_ICON[m.id];
        return (
          <button key={m.id} className="module-tile" style={{ animationDelay: `${i * 40}ms` }} onClick={() => onNavigate(m.id)}>
            <span className="module-tile__icon">
              <Icon size={24} />
            </span>
            <b>{m.name}</b>
            <small>{m.desc}</small>
            <span className="module-tile__code mono">{m.code}</span>
          </button>
        );
      })}
    </div>
  );
}

function FinanceView() {
  const total = FINANCE.categories.reduce((s, c) => s + c.value, 0);
  const g = FINANCE.savingsGoal;
  return (
    <div className="stack">
      <div className="stat-row">
        <div className="stat">
          <small>Saldo</small>
          <b className="mono">{fmtBRL(FINANCE.balance)}</b>
        </div>
        <div className="stat">
          <small>Receitas · mês</small>
          <b className="mono ok">{fmtBRL(FINANCE.monthIncome)}</b>
        </div>
        <div className="stat">
          <small>Despesas · mês</small>
          <b className="mono warn">{fmtBRL(FINANCE.monthExpense)}</b>
        </div>
        <div className="stat">
          <small>Investimentos</small>
          <b className="mono">{fmtBRL(FINANCE.investments)}</b>
        </div>
      </div>
      <section className="block">
        <h3>Evolução do saldo · 30 dias</h3>
        <Sparkline data={FINANCE.history} height={70} />
      </section>
      <section className="block">
        <h3>Despesas por categoria</h3>
        <ul className="bars">
          {FINANCE.categories.map((c) => (
            <li key={c.name}>
              <span>{c.name}</span>
              <div className="bar">
                <i style={{ width: `${(c.value / total) * 100}%` }} />
              </div>
              <b className="mono">{fmtBRL(c.value, { maximumFractionDigits: 0 })}</b>
            </li>
          ))}
        </ul>
      </section>
      <section className="block">
        <h3>{g.label}</h3>
        <div className="kv">
          <span className="mono">
            {fmtBRL(g.current, { maximumFractionDigits: 0 })} / {fmtBRL(g.target, { maximumFractionDigits: 0 })}
          </span>
          <b className="mono">{Math.round((g.current / g.target) * 100)}%</b>
        </div>
        <SegBar value={(g.current / g.target) * 100} segments={32} warn={101} />
      </section>
      <section className="block">
        <h3>Movimentações recentes</h3>
        <ul className="tx">
          {FINANCE.transactions.map((t) => (
            <li key={t.id}>
              <span>
                {t.label}
                <small>
                  {t.category} · {t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </small>
              </span>
              <b className={`mono ${t.amount > 0 ? 'ok' : ''}`}>{fmtBRL(t.amount)}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AgendaView() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const groups = [
    { label: 'Hoje', items: AGENDA.filter((e) => isSameDay(e.start, now)) },
    { label: 'Amanhã', items: AGENDA.filter((e) => isSameDay(e.start, tomorrow)) },
  ];
  return (
    <div className="stack">
      {groups.map((g) => (
        <section className="block" key={g.label}>
          <h3>{g.label}</h3>
          <ul className="timeline big">
            {g.items.map((e) => {
              const end = e.start.getTime() + e.durationMin * 60_000;
              const status = end < now.getTime() ? 'past' : e.start <= now ? 'live' : '';
              return (
                <li key={e.id} className={status}>
                  <span className="mono t">{fmtTime(e.start)}</span>
                  <span className="dot" />
                  <span className="ttl">
                    {e.title}
                    <small>
                      {e.durationMin} min{e.place ? ` · ${e.place}` : ''}
                    </small>
                  </span>
                  <span className={`tag ${e.kind}`}>{e.kind}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const toggle = (id: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <div className="stack">
      <div className="row gap center">
        <Ring value={pct} size={72} label={`${pct}%`} />
        <div>
          <b className="mono big-number">
            {done}/{tasks.length}
          </b>
          <small className="muted">tarefas concluídas</small>
        </div>
      </div>
      <ul className="checklist">
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <button onClick={() => toggle(t.id)} aria-pressed={t.done} aria-label={`Concluir ${t.title}`}>
              <span className="check" />
            </button>
            <span className="ttl">
              {t.title}
              <small>
                {t.area}
                {t.due ? ` · ${t.due.toLocaleDateString('pt-BR', { weekday: 'short' })} ${fmtTime(t.due)}` : ''}
              </small>
            </span>
            <i className={`prio ${t.priority}`} title={`Prioridade ${t.priority}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StrategyView() {
  return (
    <div className="stack">
      <div className="radar-wrap big">
        <Radar items={LIFE_AREAS} size={260} />
      </div>
      <ul className="areas">
        {LIFE_AREAS.map((a) => (
          <li key={a.id}>
            <div className="kv">
              <b>{a.name}</b>
              <b className="mono">{a.score}</b>
            </div>
            <SegBar value={a.score} segments={30} warn={101} />
            <small className="muted">{a.goal}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemoryView() {
  return (
    <div className="stack">
      <p className="muted">
        Registros que o JARVIS mantém sobre o senhor. Na próxima fase serão armazenados no Supabase com busca semântica (pgvector).
      </p>
      <ul className="memories">
        {MEMORIES.map((m) => (
          <li key={m.id}>
            <span className={`tag ${m.kind}`}>{m.kind}</span>
            <p>{m.text}</p>
            <small className="mono muted">{m.createdAt.toLocaleDateString('pt-BR')}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATES: AssistantState[] = ['idle', 'listening', 'thinking', 'speaking'];

function StateSwitcher({ state, onForceState }: { state: AssistantState; onForceState: (s: AssistantState) => void }) {
  return (
    <div className="state-switch">
      {STATES.map((s) => (
        <button key={s} className={s === state ? 'active' : ''} onClick={() => onForceState(s)}>
          {STATE_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

const ENGINE_TXT: Record<VoiceEngine, string> = {
  realtime: 'Tempo real · OpenAI via servidor seguro',
  local: 'Voz local · reconhecimento e fala do dispositivo',
  demo: 'Demonstração · escuta simulada',
};

function VoiceView({
  state,
  onForceState,
  engine,
  conn,
  onNavigate,
}: {
  state: AssistantState;
  onForceState: (s: AssistantState) => void;
  engine: VoiceEngine;
  conn: ConnStatus;
  onNavigate: (v: SheetView) => void;
}) {
  return (
    <div className="stack">
      <section className="block">
        <h3>Canal de voz</h3>
        <div className="kv">
          <span>{ENGINE_TXT[engine]}</span>
          <b className={`mono ${conn === 'on' ? 'ok' : ''}`}>{conn === 'on' ? 'ATIVO' : conn === 'connecting' ? 'CONECTANDO' : 'EM ESPERA'}</b>
        </div>
        <p className="muted small">
          Toque no microfone ou no núcleo para falar. No tempo real a conversa é contínua: fale naturalmente, interrompa quando quiser e toque
          no núcleo para silenciar a resposta.
        </p>
        <button className="primary-btn ghost" onClick={() => onNavigate('settings')}>
          Configurar voz e servidor
        </button>
      </section>
      <section className="block">
        <h3>Estado do núcleo</h3>
        <StateSwitcher state={state} onForceState={onForceState} />
      </section>
      <section className="block">
        <h3>Roadmap da voz</h3>
        <ul className="roadmap">
          <li className="done">Núcleo holográfico reativo a estados</li>
          <li className="done">Microfone real animando o núcleo (analisador de áudio)</li>
          <li className="done">Sessão de voz em tempo real via backend (credencial efêmera)</li>
          <li className="done">Voz pt-BR com personalidade de mordomo</li>
          <li className="done">Interrupção natural e painéis abertos por voz</li>
          <li>Palavra de ativação ("Jarvis") e memória de longo prazo</li>
        </ul>
      </section>
    </div>
  );
}

const QUICK_COMMANDS = [
  'Como está minha agenda hoje?',
  'Resumo financeiro',
  'Quais tarefas estão pendentes?',
  'Análise do meu plano estratégico',
  'O que você lembra sobre mim?',
  'Diagnóstico do sistema',
];

function CommandsView({
  onCommand,
  onForceState,
  state,
}: {
  onCommand: (t: string) => void;
  onForceState: (s: AssistantState) => void;
  state: AssistantState;
}) {
  return (
    <div className="stack">
      <section className="block">
        <h3>Comandos rápidos</h3>
        <div className="chips">
          {QUICK_COMMANDS.map((c) => (
            <button key={c} className="chip" onClick={() => onCommand(c)}>
              {c}
            </button>
          ))}
        </div>
      </section>
      <section className="block">
        <h3>Inspecionar animações</h3>
        <StateSwitcher state={state} onForceState={onForceState} />
        <small className="muted">Atalhos no teclado: 1 · 2 · 3 · 4</small>
      </section>
    </div>
  );
}
