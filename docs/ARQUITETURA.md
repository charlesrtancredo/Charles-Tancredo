# Arquitetura do JARVIS

## Visão geral

```
┌──────────────────────── iPhone (PWA, Safari standalone) ────────────────────────┐
│  React + TS                                                                       │
│  ├─ HoloEngine (Three.js + bloom)   ← estado: aguardando/ouvindo/pensando/falando │
│  ├─ HUD (painéis, cartões, módulos)                                               │
│  ├─ useAssistant (máquina de estados)                                             │
│  └─ Supabase JS (somente chave anon + sessão do usuário, protegido por RLS)       │
└──────────────┬──────────────────────────────────────┬────────────────────────────┘
               │ HTTPS /api (JWT do Supabase)          │ WebRTC (áudio) com token efêmero
               ▼                                       ▼
┌──────── Backend Node.js (Express) ────────┐   ┌──────── OpenAI Realtime ────────┐
│  /api/health                              │   │  voz ↔ voz em tempo real         │
│  /api/realtime/session  → token efêmero ──┼──▶│  instruções da persona JARVIS    │
│  /api/assistant (fase 3) → ferramentas    │   └──────────────────────────────────┘
│  OPENAI_API_KEY, SUPABASE_SERVICE_ROLE    │
└──────────────┬────────────────────────────┘
               ▼
┌──────── Supabase ────────┐
│  Auth (dono único)        │
│  Postgres + RLS           │
│  pgvector (memória)       │
└───────────────────────────┘
```

## Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| 3D | Three.js puro + `EffectComposer` (UnrealBloom) | Controle total dos shaders e do desempenho no iPhone, sem camadas extras |
| Estados visuais | Parâmetros interpolados (`hologram/states.ts`) | Transições suaves entre os 4 estados; fácil de ajustar |
| Áudio → visual | `HoloEngine.setLevel(nivel)` | Hoje usa envelope simulado; na fase 2 recebe o nível real do microfone/voz |
| Layout | Grid CSS + `env(safe-area-inset-*)` + `100lvh` | Notch, Dynamic Island e barra inferior do iPhone |
| PWA | `vite-plugin-pwa` (Workbox) | Manifesto, service worker e cache automáticos |
| Segredos | Somente no `server/` | Requisito: nenhuma chave no cliente |
| Voz | Token efêmero emitido pelo servidor + WebRTC direto | Menor latência sem expor a chave permanente |
| Dados | Supabase com RLS por `auth.uid()` | Mesmo se a chave anon vazar, só o dono acessa seus dados |

## Frontend (`web/src`)

- `hologram/HoloEngine.ts` — cena 3D: núcleo deformável com ruído simplex, núcleo interno,
  cascas geodésicas, 10 anéis concêntricos segmentados (shader), arcos giroscópicos,
  ~2–3,6 mil partículas, ondas circulares de voz, raios de dados, grade polar e feixe de projeção.
  Toque no núcleo (raycast) e arraste com inércia. Pausa quando o app vai para segundo plano.
- `hologram/states.ts` — parâmetros visuais de cada estado.
- `state/useAssistant.ts` — máquina de estados; será ligada ao backend na fase 2/3.
- `data/demoBrain.ts` — respostas locais do modo demonstração.
- `data/mock.ts` — dados de exemplo (agenda, tarefas, finanças, plano de vida, memória).
- `components/` — HUD, painéis, folha de módulos, dock, sequência de inicialização.

## Roadmap

1. **Fase 1 — Visual (concluída nesta versão)**: núcleo 3D, estados, HUD, módulos, PWA.
2. **Fase 2 — Voz**: microfone + `AnalyserNode` → `setLevel`; sessão Realtime via token efêmero;
   voz pt-BR; interrupção natural.
3. **Fase 3 — Inteligência**: `/api/assistant` com ferramentas (agenda, tarefas, finanças, memória)
   chamadas pelo modelo; persona do mordomo (`server/src/lib/persona.ts`).
4. **Fase 4 — Dados e memória**: aplicar `supabase/migrations`, login, CRUD real, memória com pgvector.
5. **Fase 5 — Integrações**: calendários, bancos (Open Finance), notificações push (iOS 16.4+ PWA).
