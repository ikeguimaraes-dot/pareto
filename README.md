# Pareto — Registro de Jornada de Trabalho

Sistema de registro contínuo e inteligência de gestão para equipes administrativas.

## Stack

- **Next.js 14+** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + RLS)
- **Vercel** (deploy)

---

## 1. Configurar o banco de dados (Supabase)

1. Acesse o [Supabase Dashboard](https://supabase.com) e abra seu projeto.
2. Vá em **SQL Editor** e cole + execute o conteúdo de `supabase/migrations/001_schema.sql`.
3. Isso cria todas as tabelas, políticas RLS e insere as categorias e áreas iniciais.

### Criar o primeiro admin

Após rodar a migration:

1. No Supabase Dashboard → **Authentication → Users**, clique em **Add user**.
2. Crie o usuário com e-mail e senha e marque **Auto Confirm User**.
3. Copie o UUID do usuário criado.
4. No **SQL Editor**, execute:

```sql
INSERT INTO profiles (id, nome, email, role)
VALUES ('<UUID-DO-USUARIO>', 'Nome do Admin', 'admin@exemplo.com', 'admin');
```

---

## 2. Variáveis de ambiente

### Local (`.env.local`)

Crie o arquivo `.env.local` na raiz do projeto (nunca comite este arquivo):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

As chaves estão em: Supabase Dashboard → **Project Settings → API**.

> **CRÍTICO:** A `SUPABASE_SERVICE_ROLE_KEY` ignora o RLS e dá acesso total ao banco. Nunca exponha em código cliente nem comite no Git.

### Vercel

Na Vercel, adicione as três variáveis em **Project Settings → Environment Variables**:

| Nome | Visibilidade |
|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** |

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

---

## 4. Deploy na Vercel

1. Faça push para o GitHub: `git push origin main`
2. No [Vercel Dashboard](https://vercel.com), clique **Add New Project**.
3. Importe o repositório `ikeguimaraes-dot/pareto`.
4. Configure as variáveis de ambiente (passo 2 acima).
5. Clique **Deploy**.

---

## Perfis de acesso

| Papel | Acesso |
|-------|--------|
| **admin** | Painel completo: usuários, áreas, projetos, categorias e relatórios |
| **colaborador** | Apenas registro da própria jornada e histórico pessoal |

## Relatórios disponíveis

1. **Onde o tempo vai** — total e % por categoria
2. **Tempo por pessoa** — horas e mix de atividades
3. **Tempo por projeto** — horas acumuladas por projeto
4. **Benchmark** — tempo médio por tarefa recorrente
5. **Carga vs. capacidade** — horas registradas vs. disponíveis por área
6. **80/20** — ranking de concentração de horas por pessoa
