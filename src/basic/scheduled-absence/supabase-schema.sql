-- ============================================
-- Scheduled Absence API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de tipos de ausência
CREATE TABLE IF NOT EXISTS absence_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  color VARCHAR(7) NOT NULL DEFAULT '#AD82D9',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Criar tabela de ausências agendadas
CREATE TABLE IF NOT EXISTS scheduled_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  absence_type_id UUID NOT NULL REFERENCES absence_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_date_range CHECK (end_date >= start_date)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_absence_types_name ON absence_types(name);
CREATE INDEX IF NOT EXISTS idx_absence_types_active ON absence_types(active);
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_person_id ON scheduled_absences(person_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_absence_type_id ON scheduled_absences(absence_type_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_start_date ON scheduled_absences(start_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_end_date ON scheduled_absences(end_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_date_range ON scheduled_absences USING GIST (daterange(start_date, end_date, '[]'));
CREATE INDEX IF NOT EXISTS idx_scheduled_absences_created_at ON scheduled_absences(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_absence_types_updated_at ON absence_types;
CREATE TRIGGER update_absence_types_updated_at
  BEFORE UPDATE ON absence_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_absences_updated_at ON scheduled_absences;
CREATE TRIGGER update_scheduled_absences_updated_at
  BEFORE UPDATE ON scheduled_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Função para verificar sobreposição de datas
-- ============================================
-- Esta função pode ser usada para validações adicionais se necessário
CREATE OR REPLACE FUNCTION check_absence_overlap(
  p_person_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM scheduled_absences
  WHERE person_id = p_person_id
    AND start_date <= p_end_date
    AND end_date >= p_start_date
    AND (p_exclude_id IS NULL OR id != p_exclude_id);
  
  RETURN overlap_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS nas tabelas
-- ALTER TABLE absence_types ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scheduled_absences ENABLE ROW LEVEL SECURITY;

-- Políticas para absence_types
-- CREATE POLICY "Allow authenticated users to read absence_types"
--   ON absence_types
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to insert absence_types"
--   ON absence_types
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to update absence_types"
--   ON absence_types
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to delete absence_types"
--   ON absence_types
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- Políticas para scheduled_absences
-- CREATE POLICY "Allow authenticated users to read scheduled_absences"
--   ON scheduled_absences
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Allow authenticated users to insert scheduled_absences"
--   ON scheduled_absences
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to update scheduled_absences"
--   ON scheduled_absences
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to delete scheduled_absences"
--   ON scheduled_absences
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE absence_types IS 'Tabela para armazenar tipos de ausência (Férias, Feriado, Licença, etc.)';
COMMENT ON COLUMN absence_types.id IS 'Identificador único do tipo de ausência (UUID)';
COMMENT ON COLUMN absence_types.name IS 'Nome do tipo de ausência (1-100 caracteres, único)';
COMMENT ON COLUMN absence_types.description IS 'Descrição do tipo de ausência (opcional, máximo 500 caracteres)';
COMMENT ON COLUMN absence_types.color IS 'Código de cor hexadecimal para exibição na UI (formato: #RRGGBB)';
COMMENT ON COLUMN absence_types.active IS 'Indica se o tipo de ausência está ativo e pode ser usado';
COMMENT ON COLUMN absence_types.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN absence_types.updated_at IS 'Data e hora da última atualização do registro';

COMMENT ON TABLE scheduled_absences IS 'Tabela para armazenar ausências agendadas de pessoas';
COMMENT ON COLUMN scheduled_absences.id IS 'Identificador único da ausência agendada (UUID)';
COMMENT ON COLUMN scheduled_absences.person_id IS 'Referência à pessoa que estará ausente';
COMMENT ON COLUMN scheduled_absences.absence_type_id IS 'Referência ao tipo de ausência';
COMMENT ON COLUMN scheduled_absences.start_date IS 'Data de início da ausência (formato YYYY-MM-DD)';
COMMENT ON COLUMN scheduled_absences.end_date IS 'Data de término da ausência (formato YYYY-MM-DD, deve ser >= start_date)';
COMMENT ON COLUMN scheduled_absences.description IS 'Descrição ou notas sobre a ausência (opcional, máximo 500 caracteres)';
COMMENT ON COLUMN scheduled_absences.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN scheduled_absences.updated_at IS 'Data e hora da última atualização do registro';

