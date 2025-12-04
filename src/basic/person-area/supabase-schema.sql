-- ============================================
-- Person Area API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de associação entre pessoas e áreas agendadas
CREATE TABLE IF NOT EXISTS person_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id, scheduled_area_id)
);

-- Criar tabela de junção para responsabilidades de pessoas em áreas
CREATE TABLE IF NOT EXISTS person_area_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_area_id UUID NOT NULL REFERENCES person_areas(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_area_id, responsibility_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_person_areas_person_id ON person_areas(person_id);
CREATE INDEX IF NOT EXISTS idx_person_areas_scheduled_area_id ON person_areas(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_person_areas_created_at ON person_areas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_area_responsibilities_person_area_id ON person_area_responsibilities(person_area_id);
CREATE INDEX IF NOT EXISTS idx_person_area_responsibilities_responsibility_id ON person_area_responsibilities(responsibility_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_person_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_person_areas_updated_at ON person_areas;
CREATE TRIGGER update_person_areas_updated_at
  BEFORE UPDATE ON person_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_person_areas_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS nas tabelas
-- ALTER TABLE person_areas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE person_area_responsibilities ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read person_areas"
--   ON person_areas
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert person_areas"
--   ON person_areas
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update person_areas"
--   ON person_areas
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete person_areas"
--   ON person_areas
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- Política para permitir leitura para usuários autenticados (person_area_responsibilities)
-- CREATE POLICY "Allow authenticated users to read person_area_responsibilities"
--   ON person_area_responsibilities
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados (person_area_responsibilities)
-- CREATE POLICY "Allow authenticated users to insert person_area_responsibilities"
--   ON person_area_responsibilities
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados (person_area_responsibilities)
-- CREATE POLICY "Allow authenticated users to delete person_area_responsibilities"
--   ON person_area_responsibilities
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE person_areas IS 'Tabela para armazenar associações entre pessoas e áreas agendadas';
COMMENT ON COLUMN person_areas.id IS 'Identificador único da associação pessoa-área (UUID)';
COMMENT ON COLUMN person_areas.person_id IS 'ID da pessoa (referência à tabela persons)';
COMMENT ON COLUMN person_areas.scheduled_area_id IS 'ID da área agendada (referência à tabela scheduled_areas)';
COMMENT ON COLUMN person_areas.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN person_areas.updated_at IS 'Data e hora da última atualização do registro';

COMMENT ON TABLE person_area_responsibilities IS 'Tabela de junção para responsabilidades de pessoas em áreas agendadas';
COMMENT ON COLUMN person_area_responsibilities.id IS 'Identificador único da associação (UUID)';
COMMENT ON COLUMN person_area_responsibilities.person_area_id IS 'ID da associação pessoa-área (referência à tabela person_areas)';
COMMENT ON COLUMN person_area_responsibilities.responsibility_id IS 'ID da responsabilidade (referência à tabela responsibilities)';
COMMENT ON COLUMN person_area_responsibilities.created_at IS 'Data e hora de criação do registro';

