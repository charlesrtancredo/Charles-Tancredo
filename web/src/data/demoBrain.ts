import { CONFIG } from '../config';
import { AGENDA, FINANCE, LIFE_AREAS, MEMORIES, TASKS, fmtBRL, fmtTime, isSameDay } from './mock';
import type { ModuleId } from '../state/types';

/**
 * Respostas locais do modo demonstração.
 * Na próxima fase, esta função será substituída por uma chamada ao backend
 * (`POST /api/assistant`), que conversa com a OpenAI usando a chave do servidor.
 */
export interface BrainReply {
  text: string;
  openModule?: ModuleId;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function greeting(now = new Date()): string {
  const h = now.getHours();
  const period = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const next = AGENDA.filter((e) => e.start > now && isSameDay(e.start, now))[0];
  const pending = TASKS.filter((t) => !t.done && t.priority === 'alta').length;
  const nextTxt = next ? ` Seu próximo compromisso é "${next.title}" às ${fmtTime(next.start)}.` : ' Sua agenda de hoje está livre.';
  return `${period}, ${CONFIG.ownerName}. Todos os sistemas operacionais.${nextTxt} Há ${pending} tarefa${pending === 1 ? '' : 's'} de alta prioridade aguardando sua atenção.`;
}

export function think(input: string, now = new Date()): BrainReply {
  const q = norm(input);
  const sir = CONFIG.honorific;

  if (/\b(oi|ola|bom dia|boa tarde|boa noite|jarvis)\b/.test(q) && q.length < 24) {
    return { text: greeting(now) };
  }

  if (/(agenda|compromisso|reuniao|hoje|amanha|calendario)/.test(q)) {
    const tomorrow = /amanha/.test(q);
    const ref = new Date(now);
    if (tomorrow) ref.setDate(ref.getDate() + 1);
    const evs = AGENDA.filter((e) => isSameDay(e.start, ref) && (tomorrow || e.start >= now));
    if (!evs.length) return { text: `Não há compromissos ${tomorrow ? 'para amanhã' : 'restantes hoje'}, ${sir}. Sugiro reservar o tempo para foco estratégico.`, openModule: 'agenda' };
    const list = evs.slice(0, 3).map((e) => `${fmtTime(e.start)}, ${e.title}`).join('; ');
    return { text: `${tomorrow ? 'Amanhã' : 'Ainda hoje'} o senhor tem ${evs.length} compromisso${evs.length > 1 ? 's' : ''}: ${list}.`, openModule: 'agenda' };
  }

  if (/(financ|saldo|gasto|dinheiro|orcamento|conta|invest)/.test(q)) {
    const pct = Math.round((FINANCE.monthExpense / FINANCE.budget) * 100);
    return {
      text: `Saldo disponível de ${fmtBRL(FINANCE.balance)}. Neste mês o senhor utilizou ${pct}% do orçamento, com ${fmtBRL(FINANCE.monthExpense)} em despesas. Investimentos somam ${fmtBRL(FINANCE.investments)}. Recomendo atenção à categoria Lazer, ${sir}.`,
      openModule: 'finance',
    };
  }

  if (/(tarefa|lembrete|pendente|fazer|to.?do)/.test(q)) {
    const open = TASKS.filter((t) => !t.done);
    const high = open.filter((t) => t.priority === 'alta');
    return {
      text: `Há ${open.length} tarefas em aberto, ${high.length} de alta prioridade. A mais urgente: "${high[0]?.title ?? open[0]?.title}". Deseja que eu a coloque como foco imediato?`,
      openModule: 'tasks',
    };
  }

  if (/(plano|estrateg|meta|objetivo|vida|prioridade)/.test(q)) {
    const weakest = [...LIFE_AREAS].sort((a, b) => a.score - b.score)[0];
    return {
      text: `Análise estratégica concluída. A área com maior potencial de evolução é ${weakest.name}, com índice ${weakest.score}. Sugiro uma ação concreta esta semana: ${weakest.goal.split('·')[0].trim().toLowerCase()}.`,
      openModule: 'strategy',
    };
  }

  if (/(memoria|lembra|sabe sobre|preferencia)/.test(q)) {
    return {
      text: `Mantenho ${MEMORIES.length} registros na memória de longo prazo, ${sir}. Por exemplo: ${MEMORIES[0].text.toLowerCase()}`,
      openModule: 'memory',
    };
  }

  if (/(status|sistema|diagnostico|relatorio)/.test(q)) {
    return { text: `Diagnóstico completo. Núcleo estável, renderização holográfica nominal e conexão segura. Integrações de voz e inteligência artificial aguardam ativação no servidor.` };
  }

  if (/(obrigad|valeu)/.test(q)) return { text: `Sempre às ordens, ${sir}.` };

  return {
    text: `Compreendido, ${sir}. Estou em modo demonstração: a inteligência completa será ativada quando o servidor estiver conectado. Posso informar agenda, finanças, tarefas, plano estratégico ou memória.`,
  };
}
