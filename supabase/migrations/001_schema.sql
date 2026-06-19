-- =============================================================
-- Pareto — Schema + RLS + Seed
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ---- AREAS ----
CREATE TABLE IF NOT EXISTS areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticados" ON areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita_admin" ON areas FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ---- PROJETOS ----
CREATE TABLE IF NOT EXISTS projetos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  descricao text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticados" ON projetos FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita_admin" ON projetos FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ---- CATEGORIAS DE ATIVIDADE ----
CREATE TABLE IF NOT EXISTS categorias_atividade (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6B7280'
);

ALTER TABLE categorias_atividade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticados" ON categorias_atividade FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita_admin" ON categorias_atividade FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ---- PROFILES (estende auth.users) ----
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'colaborador')) DEFAULT 'colaborador',
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  horas_dia_contratadas numeric DEFAULT 8 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Admins veem todos; colaboradores veem só o próprio perfil
CREATE POLICY "admin_acesso_total" ON profiles FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "colaborador_proprio_perfil" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ---- REGISTROS ----
CREATE TABLE IF NOT EXISTS registros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  categoria_id uuid NOT NULL REFERENCES categorias_atividade(id),
  projeto_id uuid REFERENCES projetos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  participantes text,
  inicio timestamptz NOT NULL,
  fim timestamptz,
  entrega_concluida boolean,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
-- Colaboradores só veem/editam os próprios
CREATE POLICY "colaborador_proprio_registro" ON registros FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Admins leem tudo
CREATE POLICY "admin_leitura_total" ON registros FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Garante apenas 1 bloco ativo por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_registros_ativo_por_usuario
  ON registros (user_id)
  WHERE fim IS NULL;

-- =============================================================
-- SEED: Categorias de Atividade
-- =============================================================
INSERT INTO categorias_atividade (nome, cor) VALUES
  ('Reunião', '#8B5CF6'),
  ('E-mail e comunicação', '#3B82F6'),
  ('Trabalho focado', '#10B981'),
  ('Tarefa operacional recorrente', '#F59E0B'),
  ('Imprevisto / Apagar incêndio', '#EF4444'),
  ('Pausa / Pessoal', '#6B7280')
ON CONFLICT DO NOTHING;

-- SEED: Áreas exemplo
INSERT INTO areas (nome) VALUES
  ('RH'),
  ('Financeiro'),
  ('Compras'),
  ('Marketing'),
  ('Operações')
ON CONFLICT DO NOTHING;

-- =============================================================
-- CRIAR PRIMEIRO ADMIN
-- Substitua o email e senha abaixo, depois execute no SQL Editor
-- =============================================================
-- Passo 1: No Authentication > Users do Supabase, crie o usuário manualmente
-- OU use o script de seed abaixo (requer service_role via API, não via SQL Editor).
--
-- Alternativa rápida via SQL (após criar o usuário pelo painel):
--   INSERT INTO profiles (id, nome, email, role)
--   VALUES ('<uuid-do-usuario>', 'Nome Admin', 'admin@exemplo.com', 'admin');
