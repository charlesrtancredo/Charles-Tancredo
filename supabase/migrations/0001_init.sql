-- JARVIS — esquema inicial (Supabase / PostgreSQL)
-- Ainda NÃO aplicado em nenhum projeto. Revise antes de executar:
--   supabase db push   (ou cole no SQL Editor do painel)
-- Todas as tabelas usam Row Level Security: cada linha pertence a auth.uid().

create extension if not exists vector;

-- Perfil do dono
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Senhor',
  honorific text not null default 'senhor',
  timezone text not null default 'America/Sao_Paulo',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Memória persistente (com busca semântica)
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('preferencia', 'fato', 'objetivo', 'pessoa', 'contexto')),
  content text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  embedding vector(1536),
  source text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists memories_user_idx on public.memories (user_id, created_at desc);
create index if not exists memories_embedding_idx on public.memories using hnsw (embedding vector_cosine_ops);

-- Agenda
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  kind text not null default 'pessoal',
  notes text,
  external_id text, -- futuro: sincronização com Google/Apple Calendar
  created_at timestamptz not null default now()
);
create index if not exists events_user_time_idx on public.events (user_id, starts_at);

-- Tarefas e lembretes
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  area text,
  priority text not null default 'media' check (priority in ('alta', 'media', 'baixa')),
  due_at timestamptz,
  remind_at timestamptz,
  done_at timestamptz,
  goal_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_open_idx on public.tasks (user_id, done_at, due_at);

-- Finanças
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'corrente' check (kind in ('corrente', 'poupanca', 'cartao', 'investimento', 'carteira')),
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null, -- positivo = entrada, negativo = saída
  category text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_time_idx on public.transactions (user_id, occurred_at desc);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  category text, -- null = orçamento total
  amount numeric(14, 2) not null,
  unique (user_id, month, category)
);

-- Planejamento estratégico da vida
create table if not exists public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  score smallint not null default 50 check (score between 0 and 100),
  vision text,
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  life_area_id uuid references public.life_areas (id) on delete set null,
  title text not null,
  horizon text not null default 'trimestre' check (horizon in ('semana', 'mes', 'trimestre', 'ano', 'vida')),
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'concluido', 'abandonado')),
  created_at timestamptz not null default now()
);

alter table public.tasks
  drop constraint if exists tasks_goal_fk,
  add constraint tasks_goal_fk foreign key (goal_id) references public.goals (id) on delete set null;

-- Conversas (histórico com o JARVIS)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- Row Level Security: o dono só enxerga os próprios dados
do $$
declare t text;
begin
  foreach t in array array['memories','events','tasks','accounts','transactions','budgets','life_areas','goals','conversations','messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists owner_all on public.profiles;
create policy owner_all on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Busca semântica na memória
create or replace function public.match_memories(query_embedding vector(1536), match_count int default 8)
returns table (id uuid, kind text, content text, similarity float)
language sql stable security invoker as $$
  select m.id, m.kind, m.content, 1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = auth.uid() and m.embedding is not null
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
