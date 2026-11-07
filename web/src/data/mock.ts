// Dados de demonstração. Serão substituídos por tabelas do Supabase via backend.

export interface AgendaEvent {
  id: string;
  title: string;
  start: Date;
  durationMin: number;
  place?: string;
  kind: 'reuniao' | 'pessoal' | 'saude' | 'foco';
}

export interface Task {
  id: string;
  title: string;
  due?: Date;
  priority: 'alta' | 'media' | 'baixa';
  done: boolean;
  area: string;
}

export interface Transaction {
  id: string;
  label: string;
  amount: number;
  category: string;
  date: Date;
}

export interface LifeArea {
  id: string;
  name: string;
  score: number; // 0..100
  goal: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  kind: 'preferencia' | 'fato' | 'objetivo' | 'pessoa';
  createdAt: Date;
}

const today = new Date();
const at = (h: number, m = 0, dayOffset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};

export const AGENDA: AgendaEvent[] = [
  { id: 'e1', title: 'Treino funcional', start: at(7, 0), durationMin: 60, place: 'Academia', kind: 'saude' },
  { id: 'e2', title: 'Bloco de foco profundo', start: at(9, 0), durationMin: 120, kind: 'foco' },
  { id: 'e3', title: 'Reunião de planejamento trimestral', start: at(11, 30), durationMin: 60, place: 'Sala Stark · online', kind: 'reuniao' },
  { id: 'e4', title: 'Almoço com investidor', start: at(13, 0), durationMin: 90, place: 'Restaurante Fasano', kind: 'reuniao' },
  { id: 'e5', title: 'Revisão financeira semanal', start: at(17, 30), durationMin: 30, kind: 'pessoal' },
  { id: 'e6', title: 'Jantar em família', start: at(20, 0), durationMin: 120, kind: 'pessoal' },
  { id: 'e7', title: 'Consulta médica de rotina', start: at(10, 0, 1), durationMin: 45, place: 'Clínica Vita', kind: 'saude' },
];

export const TASKS: Task[] = [
  { id: 't1', title: 'Enviar proposta revisada ao cliente', due: at(12, 0), priority: 'alta', done: false, area: 'Carreira' },
  { id: 't2', title: 'Pagar fatura do cartão', due: at(18, 0), priority: 'alta', done: false, area: 'Finanças' },
  { id: 't3', title: 'Ler 30 páginas', due: at(22, 0), priority: 'media', done: true, area: 'Aprendizado' },
  { id: 't4', title: 'Agendar revisão do carro', due: at(9, 0, 2), priority: 'media', done: false, area: 'Pessoal' },
  { id: 't5', title: 'Rebalancear carteira de investimentos', due: at(10, 0, 4), priority: 'baixa', done: false, area: 'Finanças' },
  { id: 't6', title: 'Meditação 10 minutos', due: at(7, 30), priority: 'baixa', done: true, area: 'Saúde' },
];

export const FINANCE = {
  balance: 48_732.55,
  monthIncome: 21_500,
  monthExpense: 12_874.3,
  budget: 15_000,
  investments: 186_420.0,
  savingsGoal: { label: 'Reserva de oportunidade', current: 62_000, target: 100_000 },
  /** Saldo diário dos últimos 30 dias (para gráfico). */
  history: Array.from({ length: 30 }, (_, i) => 41_000 + i * 240 + Math.sin(i * 0.9) * 1600 + Math.cos(i * 0.37) * 900),
  categories: [
    { name: 'Moradia', value: 4_850 },
    { name: 'Alimentação', value: 2_310.4 },
    { name: 'Transporte', value: 1_120.9 },
    { name: 'Saúde', value: 980 },
    { name: 'Lazer', value: 1_640 },
    { name: 'Educação', value: 1_973 },
  ],
  transactions: [
    { id: 'f1', label: 'Supermercado Pão de Açúcar', amount: -412.37, category: 'Alimentação', date: at(19, 12, -1) },
    { id: 'f2', label: 'Honorários — projeto Atlas', amount: 8_500, category: 'Receita', date: at(10, 3, -2) },
    { id: 'f3', label: 'Combustível', amount: -289.9, category: 'Transporte', date: at(8, 40, -2) },
    { id: 'f4', label: 'Curso de liderança', amount: -1_200, category: 'Educação', date: at(14, 20, -3) },
    { id: 'f5', label: 'Dividendos', amount: 643.21, category: 'Investimentos', date: at(9, 0, -4) },
  ] as Transaction[],
};

export const LIFE_AREAS: LifeArea[] = [
  { id: 'l1', name: 'Saúde', score: 72, goal: 'Treinar 4x por semana · dormir 7h30' },
  { id: 'l2', name: 'Carreira', score: 81, goal: 'Fechar 3 novos contratos no trimestre' },
  { id: 'l3', name: 'Finanças', score: 68, goal: 'Reserva de R$ 100 mil até dezembro' },
  { id: 'l4', name: 'Relações', score: 77, goal: 'Jantar em família 3x por semana' },
  { id: 'l5', name: 'Aprendizado', score: 59, goal: '12 livros no ano · inglês fluente' },
  { id: 'l6', name: 'Propósito', score: 64, goal: 'Projeto social mensal' },
];

export const MEMORIES: MemoryItem[] = [
  { id: 'm1', text: 'Prefere reuniões pela manhã e blocos de foco antes do almoço.', kind: 'preferencia', createdAt: at(9, 0, -12) },
  { id: 'm2', text: 'Meta principal do ano: independência financeira parcial.', kind: 'objetivo', createdAt: at(9, 0, -40) },
  { id: 'm3', text: 'Café sem açúcar, sempre às 15h.', kind: 'preferencia', createdAt: at(15, 0, -20) },
  { id: 'm4', text: 'Aniversário da mãe: 14 de março.', kind: 'pessoa', createdAt: at(11, 0, -60) },
  { id: 'm5', text: 'Alergia leve a frutos do mar.', kind: 'fato', createdAt: at(11, 0, -90) },
];

export const fmtBRL = (v: number, opts: Intl.NumberFormatOptions = {}) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', ...opts });

export const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
