import { CONFIG } from '../config';
import { AGENDA, FINANCE, LIFE_AREAS, MEMORIES, TASKS, fmtBRL, fmtTime } from './mock';

/**
 * Resumo dos dados pessoais enviado à sessão de voz como contexto de sistema.
 * Na fase 4 virá do Supabase (via backend) em vez dos dados de demonstração.
 */
export function buildVoiceContext(now = new Date()): string {
  const day = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const agenda = AGENDA.map((e) => `- ${day(e.start)} ${fmtTime(e.start)} (${e.durationMin} min): ${e.title}${e.place ? ` — ${e.place}` : ''}`).join('\n');
  const tasks = TASKS.map((t) => `- [${t.done ? 'x' : ' '}] ${t.title} · prioridade ${t.priority} · ${t.area}${t.due ? ` · prazo ${day(t.due)} ${fmtTime(t.due)}` : ''}`).join('\n');
  const cats = FINANCE.categories.map((c) => `${c.name} ${fmtBRL(c.value)}`).join(', ');
  const tx = FINANCE.transactions.map((t) => `${t.label} ${fmtBRL(t.amount)}`).join('; ');
  const areas = LIFE_AREAS.map((a) => `- ${a.name}: ${a.score}/100 — meta: ${a.goal}`).join('\n');
  const mem = MEMORIES.map((m) => `- (${m.kind}) ${m.text}`).join('\n');

  return `CONTEXTO ATUAL (dados de demonstração do ${CONFIG.ownerName}; trate como reais nesta sessão)
Data e hora: ${now.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}

AGENDA
${agenda}

TAREFAS
${tasks}

FINANÇAS
Saldo: ${fmtBRL(FINANCE.balance)} · Receitas do mês: ${fmtBRL(FINANCE.monthIncome)} · Despesas do mês: ${fmtBRL(FINANCE.monthExpense)} de orçamento ${fmtBRL(FINANCE.budget)}
Investimentos: ${fmtBRL(FINANCE.investments)} · Meta "${FINANCE.savingsGoal.label}": ${fmtBRL(FINANCE.savingsGoal.current)} de ${fmtBRL(FINANCE.savingsGoal.target)}
Despesas por categoria: ${cats}
Últimas movimentações: ${tx}

PLANO DE VIDA
${areas}

MEMÓRIA
${mem}`;
}
