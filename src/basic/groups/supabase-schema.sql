-- ============================================
-- Groups API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de grupos dentro de áreas agendadas
CREATE TABLE IF NOT EXISTS area_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scheduled_area_id, name)
);

-- Criar tabela de associação entre pessoas e grupos (membros)
CREATE TABLE IF NOT EXISTS area_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES area_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, person_id)
);

-- Criar tabela de junção para responsabilidades de membros em grupos
CREATE TABLE IF NOT EXISTS area_group_member_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_member_id UUID NOT NULL REFERENCES area_group_members(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_member_id, responsibility_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_area_groups_scheduled_area_id ON area_groups(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_area_groups_name ON area_groups(name);
CREATE INDEX IF NOT EXISTS idx_area_groups_created_at ON area_groups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_area_group_members_person_id ON area_group_members(person_id);
CREATE INDEX IF NOT EXISTS idx_area_group_members_group_id ON area_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_area_group_members_created_at ON area_group_members(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_area_group_member_responsibilities_group_member_id ON area_group_member_responsibilities(group_member_id);
CREATE INDEX IF NOT EXISTS idx_area_group_member_responsibilities_responsibility_id ON area_group_member_responsibilities(responsibility_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_area_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_area_group_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_area_groups_updated_at ON area_groups;
CREATE TRIGGER update_area_groups_updated_at
  BEFORE UPDATE ON area_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_area_groups_updated_at();

DROP TRIGGER IF EXISTS update_area_group_members_updated_at ON area_group_members;
CREATE TRIGGER update_area_group_members_updated_at
  BEFORE UPDATE ON area_group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_area_group_members_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS nas tabelas
-- ALTER TABLE area_groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE area_group_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE area_group_member_responsibilities ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read area_groups"
--   ON area_groups
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert area_groups"
--   ON area_groups
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update area_groups"
--   ON area_groups
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete area_groups"
--   ON area_groups
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- Política para permitir leitura para usuários autenticados (area_group_members)
-- CREATE POLICY "Allow authenticated users to read area_group_members"
--   ON area_group_members
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados (area_group_members)
-- CREATE POLICY "Allow authenticated users to insert area_group_members"
--   ON area_group_members
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados (area_group_members)
-- CREATE POLICY "Allow authenticated users to update area_group_members"
--   ON area_group_members
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados (area_group_members)
-- CREATE POLICY "Allow authenticated users to delete area_group_members"
--   ON area_group_members
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- Política para permitir leitura para usuários autenticados (area_group_member_responsibilities)
-- CREATE POLICY "Allow authenticated users to read area_group_member_responsibilities"
--   ON area_group_member_responsibilities
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados (area_group_member_responsibilities)
-- CREATE POLICY "Allow authenticated users to insert area_group_member_responsibilities"
--   ON area_group_member_responsibilities
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados (area_group_member_responsibilities)
-- CREATE POLICY "Allow authenticated users to delete area_group_member_responsibilities"
--   ON area_group_member_responsibilities
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE area_groups IS 'Tabela para armazenar grupos dentro de áreas agendadas';
COMMENT ON COLUMN area_groups.id IS 'Identificador único do grupo (UUID)';
COMMENT ON COLUMN area_groups.name IS 'Nome do grupo';
COMMENT ON COLUMN area_groups.description IS 'Descrição do grupo';
COMMENT ON COLUMN area_groups.scheduled_area_id IS 'ID da área agendada (referência à tabela scheduled_areas)';
COMMENT ON COLUMN area_groups.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN area_groups.updated_at IS 'Data e hora da última atualização do registro';

COMMENT ON TABLE area_group_members IS 'Tabela para armazenar associações entre pessoas e grupos (membros)';
COMMENT ON COLUMN area_group_members.id IS 'Identificador único da associação pessoa-grupo (UUID)';
COMMENT ON COLUMN area_group_members.person_id IS 'ID da pessoa (referência à tabela persons)';
COMMENT ON COLUMN area_group_members.group_id IS 'ID do grupo (referência à tabela area_groups)';
COMMENT ON COLUMN area_group_members.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN area_group_members.updated_at IS 'Data e hora da última atualização do registro';

COMMENT ON TABLE area_group_member_responsibilities IS 'Tabela de junção para responsabilidades de membros em grupos';
COMMENT ON COLUMN area_group_member_responsibilities.id IS 'Identificador único da associação (UUID)';
COMMENT ON COLUMN area_group_member_responsibilities.group_member_id IS 'ID da associação pessoa-grupo (referência à tabela area_group_members)';
COMMENT ON COLUMN area_group_member_responsibilities.responsibility_id IS 'ID da responsabilidade (referência à tabela responsibilities)';
COMMENT ON COLUMN area_group_member_responsibilities.created_at IS 'Data e hora de criação do registro';

