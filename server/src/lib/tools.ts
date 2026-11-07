/**
 * Ferramentas que o modelo de voz pode acionar. São executadas no cliente
 * (abrir painéis) e, nas próximas fases, também no servidor (CRUD no Supabase).
 */
export const MODULES = ['finance', 'agenda', 'tasks', 'strategy', 'memory', 'commands'] as const;

export const realtimeTools = [
  {
    type: 'function',
    name: 'abrir_modulo',
    description:
      'Abre um painel holográfico na interface para mostrar dados ao senhor. Use quando a resposta envolver finanças, agenda, tarefas, plano estratégico, memória ou comandos.',
    parameters: {
      type: 'object',
      properties: {
        modulo: { type: 'string', enum: MODULES, description: 'Painel a ser aberto' },
      },
      required: ['modulo'],
    },
  },
  {
    type: 'function',
    name: 'fechar_painel',
    description: 'Fecha o painel aberto, devolvendo a visão ao núcleo holográfico.',
    parameters: { type: 'object', properties: {} },
  },
];
