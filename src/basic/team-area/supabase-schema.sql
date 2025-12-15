-- ============================================
-- Team Area API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de equipes (teams) dentro de áreas agendadas
CREATE TABLE IF NOT EXISTS area_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000),
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scheduled_area_id, name)
);

-- Criar tabela de funções (roles) dentro de equipes
CREATE TABLE IF NOT EXISTS area_team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES area_teams(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  priority INTEGER NOT NULL CHECK (priority >= 1),
  is_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, priority)
);

-- Criar tabela de pessoas fixas atribuídas a funções
CREATE TABLE IF NOT EXISTS area_team_role_fixed_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_role_id UUID NOT NULL REFERENCES area_team_roles(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_role_id, person_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_area_teams_scheduled_area_id ON area_teams(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_area_teams_name ON area_teams(name);
CREATE INDEX IF NOT EXISTS idx_area_teams_created_at ON area_teams(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_area_team_roles_team_id ON area_team_roles(team_id);
CREATE INDEX IF NOT EXISTS idx_area_team_roles_responsibility_id ON area_team_roles(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_area_team_roles_priority ON area_team_roles(team_id, priority);
CREATE INDEX IF NOT EXISTS idx_area_team_roles_created_at ON area_team_roles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_area_team_role_fixed_persons_team_role_id ON area_team_role_fixed_persons(team_role_id);
CREATE INDEX IF NOT EXISTS idx_area_team_role_fixed_persons_person_id ON area_team_role_fixed_persons(person_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_area_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_area_team_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_area_teams_updated_at ON area_teams;
CREATE TRIGGER update_area_teams_updated_at
  BEFORE UPDATE ON area_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_area_teams_updated_at();

DROP TRIGGER IF EXISTS update_area_team_roles_updated_at ON area_team_roles;
CREATE TRIGGER update_area_team_roles_updated_at
  BEFORE UPDATE ON area_team_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_area_team_roles_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS nas tabelas
-- ALTER TABLE area_teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE area_team_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE area_team_role_fixed_persons ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read area_teams"
--   ON area_teams
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to read area_team_roles"
--   ON area_team_roles
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to read area_team_role_fixed_persons"
--   ON area_team_role_fixed_persons
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert area_teams"
--   ON area_teams
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to insert area_team_roles"
--   ON area_team_roles
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to insert area_team_role_fixed_persons"
--   ON area_team_role_fixed_persons
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update area_teams"
--   ON area_teams
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to update area_team_roles"
--   ON area_team_roles
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete area_teams"
--   ON area_teams
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to delete area_team_roles"
--   ON area_team_roles
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to delete area_team_role_fixed_persons"
--   ON area_team_role_fixed_persons
--   FOR DELETE
--   TO authenticated
--   USING (true);












