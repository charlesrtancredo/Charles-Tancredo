export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type ModuleId = 'voice' | 'finance' | 'agenda' | 'tasks' | 'strategy' | 'memory' | 'commands';

export interface ChatMessage {
  id: string;
  role: 'user' | 'jarvis';
  text: string;
  at: number;
}

export const STATE_LABEL: Record<AssistantState, string> = {
  idle: 'Aguardando',
  listening: 'Ouvindo',
  thinking: 'Processando',
  speaking: 'Respondendo',
};
