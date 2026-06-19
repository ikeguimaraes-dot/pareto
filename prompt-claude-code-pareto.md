
## INÍCIO DO PROMPT

Você vai construir, do zero, uma aplicação web de produção chamada **Pareto**. Trabalhe de forma incremental, seguindo a ordem de construção no final. Ao terminar cada bloco, rode/valide antes de seguir. Use TypeScript em tudo. A interface deve ser **100% em português do Brasil**, com fuso horário `America/Sao_Paulo`.

### 1. O que é o Pareto (contexto do produto)

Pareto é um sistema de **registro contínuo e auto-reportado da jornada de trabalho** de equipes administrativas (RH, Financeiro, Compras, Marketing etc.). Cada colaborador registra, ao longo do dia, o que está fazendo em tempo real — em blocos de tempo encadeados:

- Chegou às 8h → leu e-mail até 8h30 → reunião com Fulano sobre tema X até 10h → trabalhou no projeto Y até 12h → saiu para almoço…

O objetivo do dono/gestor é **transformar esses registros em inteligência de gestão** para responder três perguntas:
1. Quanto tempo cada área e cada pessoa gasta, e em quê?
2. Quanto tempo cada tipo de tarefa realmente leva (benchmark)?
3. Alguma área está superdimensionada ou subdimensionada? Quem concentra a entrega (o 80/20)?

O diferencial em relação a um simples diário é a **taxonomia estruturada**: cada bloco é etiquetado (área, categoria de atividade, projeto), o que permite somar, cruzar e gerar relatórios. O preenchimento precisa ter **atrito mínimo** — se for trabalhoso, ninguém usa.

### 2. Stack obrigatória

- **Next.js 14+** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** para estilo; componentes limpos e responsivos (colaboradores podem registrar pelo celular)
- **Supabase**: banco Postgres, **Auth por e-mail/senha**, e **Row Level Security (RLS)**
- Deploy na **Vercel**, código versionado no **GitHub**
- Datas/horas sempre em `America/Sao_Paulo`; use uma lib leve (date-fns ou Day.js) para formatação em pt-BR

### 3. Perfis de acesso (RBAC)

- **admin** (dono/gestor): acesso total. Cadastra usuários, gerencia áreas/projetos/categorias e vê todos os relatórios.
- **colaborador**: registra apenas a própria jornada e vê o próprio histórico. Não acessa dados de outros nem a área admin.

Login redireciona conforme o papel: admin → painel admin; colaborador → tela de registro.

### 4. Modelo de dados (Postgres / Supabase)

Crie as tabelas via migration SQL, com RLS habilitada. Sugestão de schema:

- **profiles** (estende `auth.users`): `id` (uuid, = auth.users.id), `nome`, `email`, `role` (`admin` | `colaborador`), `area_id` (fk areas, nullable), `horas_dia_contratadas` (numeric, default 8), `ativo` (bool, default true), `created_at`.
- **areas**: `id`, `nome` (ex.: RH, Financeiro, Compras, Marketing), `ativo`, `created_at`.
- **projetos**: `id`, `nome`, `area_id` (fk, nullable), `descricao`, `ativo`, `created_at`.
- **categorias_atividade**: `id`, `nome`, `cor` (hex). Seed inicial com: Reunião, E-mail e comunicação, Trabalho focado, Tarefa operacional recorrente, Imprevisto/Apagar incêndio, Pausa/Pessoal.
- **registros** (o log central): `id`, `user_id` (fk profiles), `area_id` (fk, preenchida a partir do perfil mas editável), `categoria_id` (fk, obrigatória), `projeto_id` (fk, nullable), `descricao` (text), `participantes` (text, nullable — ex.: "com Fulano sobre orçamento"), `inicio` (timestamptz, obrigatório), `fim` (timestamptz, nullable enquanto a atividade está ativa), `created_at`, `updated_at`. Bloco "ativo" = `fim IS NULL`. Garanta que cada usuário só tenha **um** registro ativo por vez.
- (Fase 2, deixe preparado mas não bloqueie a v1) **entregaveis** para sinal de qualidade: `id`, `registro_id` ou `projeto_id`, `concluido` (bool), `retrabalho` (bool), `aprovado_por`. A v1 pode trazer só um campo opcional `entrega_concluida` (bool) no registro.

**RLS:**
- `colaborador`: SELECT/INSERT/UPDATE apenas onde `user_id = auth.uid()`.
- `admin`: acesso total de leitura a tudo; escrita em areas/projetos/categorias/profiles.
- Tabelas de configuração (areas, projetos, categorias): leitura para todos autenticados; escrita só admin.

### 5. Telas e funcionalidades

**Autenticação**
- Tela de login (e-mail/senha) e logout. Recuperação de senha via Supabase. Rotas protegidas por middleware. No primeiro acesso, mostre um aviso curto de transparência sobre o registro de jornada (boa prática e aderência à LGPD).

**Área do colaborador (foco em atrito zero)**
- **Registro contínuo**: botão grande "Iniciar atividade" que abre um seletor rápido — categoria (obrigatória), projeto (opcional), descrição curta, participantes (se reunião). Ao confirmar, cria um bloco ativo com `inicio = agora`.
- Mostra um **cronômetro rodando** do bloco ativo.
- Botão "Encerrar e iniciar próxima" que fecha o bloco atual (`fim = agora`) e já abre o seletor da próxima — o encadeamento é o coração da experiência.
- Atalhos rápidos: "Cheguei", "Saída para almoço", "Fim do expediente".
- **Linha do tempo do dia**: lista cronológica dos blocos de hoje, total de horas registradas e destaque visual de lacunas não registradas.
- Permitir **editar/corrigir** um bloco passado; registre `updated_at` para integridade (admin pode ver que houve edição).

**Área do admin**
- **Gestão de usuários**: criar colaborador (nome, e-mail, área, papel e **senha definida pelo próprio admin no momento do cadastro**). Use a Supabase Admin API (`supabase.auth.admin.createUser`) **no servidor**, passando `password` preenchido e `email_confirm: true`, para a conta já nascer ativa, sem e-mail de confirmação. O admin também deve poder **redefinir a senha** de um colaborador depois (`supabase.auth.admin.updateUserById`). Ativar/desativar, editar área e papel. A `service_role` é usada **apenas no servidor** — nunca no cliente.
- **Gestão de áreas, projetos e categorias** (CRUD).
- **Relatórios** (com filtros por período, área e pessoa; e botão de **exportar CSV** em cada um):
  1. **Onde o tempo vai** — total e % por área e por categoria.
  2. **Tempo por pessoa + mix** — horas por pessoa e distribuição entre categorias (quem produz vs. quem só reúne).
  3. **Tempo por projeto/entregável** — horas acumuladas por projeto.
  4. **Benchmark de tarefas** — tempo médio por tipo de tarefa recorrente (agrupado por categoria/descrição), pra revelar o lento e criar padrão.
  5. **Carga vs. capacidade por área** — horas registradas vs. horas disponíveis (`horas_dia_contratadas` × dias úteis × nº de pessoas), apontando super/subdimensionamento.
  6. **Concentração 80/20** — ranking de quem concentra horas produtivas/entregas por área.
- Use gráficos simples e legíveis (barras/pizza) — priorize clareza sobre enfeite.

### 6. Configuração, segurança e deploy

- **Variáveis de ambiente.** Crie um `.env.local` (e um `.env.example` sem os valores secretos). O projeto Supabase já existe — use estes valores:

  ```bash
  # .env.local — NÃO commitar este arquivo
  NEXT_PUBLIC_SUPABASE_URL=https://afxsrcezmetipzgosdvb.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmeHNyY2V6bWV0aXB6Z29zZHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjMxNjAsImV4cCI6MjA5MDE5OTE2MH0.HYfbH91E8p_9jYbN5xEl3M5HXttj0E8pbEhHaEIUTrs
  # SECRETO — uso exclusivo no servidor, jamais no cliente nem no Git
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmeHNyY2V6bWV0aXB6Z29zZHZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyMzE2MCwiZXhwIjoyMDkwMTk5MTYwfQ.vsGS--pFgMlhhr29hMV8AbUsuETqtlDnFFaU2AcaKIA
  ```

  > **CRÍTICO:** garanta que `.env.local` (e qualquer `.env*` com segredos) esteja no `.gitignore` antes do primeiro commit. A `SUPABASE_SERVICE_ROLE_KEY` ignora o RLS e dá acesso total ao banco — ela só pode ser lida em código server-side (Route Handlers / Server Actions) e configurada como variável de ambiente na Vercel. Nunca a exponha em componentes de cliente, nunca a coloque em variáveis com prefixo `NEXT_PUBLIC_`, e nunca a commite no GitHub.

- Entregue as **migrations SQL** (schema + políticas RLS + seed de áreas e categorias) e um script/instrução para **criar o primeiro usuário admin**.
- Inicialize o repositório Git e configure o remoto `origin` para `https://github.com/ikeguimaraes-dot/pareto.git`; faça commits limpos e o primeiro push para a branch `main`. Gere um **README** com o passo a passo: rodar as migrations no Supabase, configurar as três variáveis de ambiente na Vercel (incluindo a `service_role` como secret), conectar este repositório do GitHub à Vercel e publicar.
- Valide papel (admin) no servidor em toda rota e action sensível. Trate erros com mensagens claras em pt-BR; estados de carregamento; e impeça dois blocos ativos simultâneos para o mesmo usuário.

### 7. Ordem de construção (siga nesta sequência)

1. Scaffold do Next.js + Tailwind + cliente Supabase (browser e server).
2. Migrations: schema + RLS + seed; script do primeiro admin.
3. Autenticação: login/logout, proteção de rotas, redirecionamento por papel.
4. Área do colaborador: registro contínuo + cronômetro + linha do tempo do dia + edição de blocos.
5. Área admin: gestão de usuários (com service_role no servidor) + CRUD de áreas/projetos/categorias.
6. Relatórios com filtros + export CSV.
7. Polimento responsivo (mobile), tratamento de erros, README e deploy na Vercel.

### 8. Definição de "pronto" (critérios de aceite)

- Um admin consegue: logar, cadastrar um colaborador, criar áreas/projetos, e ver os 6 relatórios com dados reais e exportar CSV.
- Um colaborador consegue: logar, registrar o dia inteiro em blocos encadeados pelo celular ou desktop, ver sua linha do tempo e corrigir um bloco.
- RLS garante que colaborador não enxerga dado de ninguém além de si.
- Aplicação publicada na Vercel, com repositório no GitHub e migrations versionadas.

## FIM DO PROMPT
