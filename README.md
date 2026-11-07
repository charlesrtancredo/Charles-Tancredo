# J.A.R.V.I.S.

Assistente pessoal holográfico — PWA para iPhone com núcleo 3D em Three.js, backend Node.js e Supabase.

> **Fase 2 (esta versão):** núcleo holográfico 3D + **voz real**.
> - **Tempo real (OpenAI):** conversa por voz contínua via WebRTC, com credencial efêmera emitida pelo servidor,
>   persona de mordomo, transcrição na tela, interrupção natural e painéis abertos por voz.
> - **Voz local:** reconhecimento e fala do próprio dispositivo (sem servidor, sem custo).
> - **Microfone real animando o núcleo** em ambos os modos.
>
> Dados pessoais ainda são de demonstração; Supabase e memória real chegam nas próximas fases.

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

## Ativar a voz em tempo real (local)

```bash
cp server/.env.example server/.env
# edite server/.env: OPENAI_API_KEY e ACCESS_CODE (gere com o comando indicado no arquivo)
npm run dev:server     # terminal 1
npm run dev            # terminal 2
```

No app: **⚙ Configurações → Código de acesso pessoal** → cole o `ACCESS_CODE` → *Salvar e testar*.
Toque no microfone: o JARVIS cumprimenta e a conversa segue naturalmente. Toque no núcleo para
interromper a fala; toque no botão verde para encerrar.

> O microfone no iPhone exige **HTTPS** (ou `localhost`). Para testar no celular, use uma das
> publicações abaixo.

## Publicação (HTTPS) e instalação no iPhone

### Opção 1 — Render (recomendado: app + voz real, um único endereço)

1. [render.com](https://render.com) → **New → Blueprint** → selecione este repositório (usa `render.yaml`).
2. Informe `OPENAI_API_KEY` quando solicitado. O `ACCESS_CODE` é gerado automaticamente
   (veja em *Environment* do serviço).
3. Abra `https://jarvis-xxxx.onrender.com` no Safari do iPhone → ⚙ → cole o código de acesso.

> O plano gratuito do Render "dorme" após inatividade; o primeiro acesso pode levar ~1 min.

### Opção 2 — GitHub Pages (somente o app; voz local ou demonstração)

1. GitHub → **Settings → Pages → Source: GitHub Actions** (uma única vez).
2. O workflow `.github/workflows/deploy-pages.yml` publica a cada push em
   `https://charlesrtancredo.github.io/Charles-Tancredo/`.
3. Para usar a voz em tempo real a partir do Pages, informe o endereço do backend (Render) em ⚙ Configurações.
   O `ALLOWED_ORIGINS` do servidor já inclui `https://charlesrtancredo.github.io`.

### Adicionar à Tela de Início

Safari → **Compartilhar → Adicionar à Tela de Início**. O JARVIS abre em tela cheia, com ícone próprio.

## Interações

| Ação | Resultado |
| --- | --- |
| Botão do microfone | Inicia a voz (tempo real, local ou demonstração — ver ⚙) |
| Tocar no núcleo | Inicia a voz; durante a fala em tempo real, interrompe o JARVIS |
| Arrastar o holograma | Gira o núcleo 3D com inércia |
| Digitar um comando | Pensando → respondendo (ex.: "agenda", "finanças", "tarefas") |
| Botão de grade | Abre os módulos |
| Central de comandos | Alterna manualmente os 4 estados visuais |
| Teclado (desktop) | `1` aguardando · `2` ouvindo · `3` pensando · `4` falando · `espaço` escuta |

## Segurança

- Nenhuma chave de API existe no frontend. A OpenAI é chamada apenas pelo `server/`.
- A voz em tempo real usa **credenciais efêmeras** (≈1 min) emitidas pelo backend (`POST /api/realtime/session`);
  persona e ferramentas são definidas no servidor.
- Autenticação pessoal por `ACCESS_CODE` (comparação em tempo constante) ou JWT do Supabase restrito ao `OWNER_EMAIL`.
- Limite de 60 requisições/min por IP na API, CORS restrito a `ALLOWED_ORIGINS`.
- Todas as tabelas têm Row Level Security por `auth.uid()`.

Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para detalhes e roadmap.
