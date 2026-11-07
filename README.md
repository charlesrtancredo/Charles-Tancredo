# J.A.R.V.I.S.

Assistente pessoal holográfico — PWA para iPhone com núcleo 3D em Three.js, backend Node.js e Supabase.

> **Fase 1 (esta versão):** experiência visual cinematográfica funcional, com estados animados,
> painéis em tempo real, módulos navegáveis e respostas em **modo demonstração** (locais, sem IA).
> Voz, inteligência artificial, memória real e integrações chegam nas próximas fases.

## Estrutura

```
web/        Frontend PWA — React 19 + TypeScript + Vite + Three.js
server/     Backend — Node.js + Express + TypeScript (chaves de API só aqui)
supabase/   Migrações SQL (tabelas + RLS + pgvector) — ainda não aplicadas
docs/       Arquitetura e roadmap
```

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install            # instala web + server (npm workspaces)
npm run dev            # frontend em http://localhost:5173
npm run dev:server     # backend em http://localhost:8787 (opcional nesta fase)
```

Para testar no iPhone na mesma rede Wi-Fi, abra `http://<ip-do-computador>:5173` no Safari.

### Build de produção

```bash
npm run build
npm run preview --workspace web
```

## Instalar no iPhone (PWA)

1. Publique o `web/dist` em um host com **HTTPS** (Vercel, Netlify, Cloudflare Pages…).
2. Abra a URL no **Safari** do iPhone.
3. Toque em **Compartilhar → Adicionar à Tela de Início**.
4. O JARVIS abre em tela cheia, com ícone próprio e funcionamento offline da interface.

## Interações

| Ação | Resultado |
| --- | --- |
| Tocar no núcleo / botão do microfone | Inicia a escuta (simulada nesta fase) |
| Arrastar o holograma | Gira o núcleo 3D com inércia |
| Digitar um comando | Pensando → respondendo (ex.: "agenda", "finanças", "tarefas") |
| Botão de grade | Abre os módulos |
| Central de comandos | Alterna manualmente os 4 estados visuais |
| Teclado (desktop) | `1` aguardando · `2` ouvindo · `3` pensando · `4` falando · `espaço` escuta |

## Segurança

- Nenhuma chave de API existe no frontend. A OpenAI é chamada apenas pelo `server/`.
- A voz em tempo real usará **credenciais efêmeras** emitidas pelo backend (`POST /api/realtime/session`).
- Autenticação via Supabase Auth; o backend valida o JWT e restringe ao `OWNER_EMAIL`.
- Todas as tabelas têm Row Level Security por `auth.uid()`.

Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para detalhes e roadmap.
