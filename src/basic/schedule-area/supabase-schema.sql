-- ============================================
-- Scheduled Area API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de áreas de escala
CREATE TABLE IF NOT EXISTS scheduled_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000),
  responsible_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  image_url TEXT,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_scheduled_areas_responsible_person_id ON scheduled_areas(responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_areas_favorite ON scheduled_areas(favorite);
CREATE INDEX IF NOT EXISTS idx_scheduled_areas_created_at ON scheduled_areas(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_scheduled_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_scheduled_areas_updated_at ON scheduled_areas;
CREATE TRIGGER update_scheduled_areas_updated_at
  BEFORE UPDATE ON scheduled_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_areas_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS na tabela
-- ALTER TABLE scheduled_areas ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read scheduled_areas"
--   ON scheduled_areas
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert scheduled_areas"
--   ON scheduled_areas
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update scheduled_areas"
--   ON scheduled_areas
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete scheduled_areas"
--   ON scheduled_areas
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Storage Bucket para Imagens
-- ============================================
-- Execute no SQL Editor do Supabase para criar o bucket de storage

-- Criar bucket para imagens de áreas de escala
INSERT INTO storage.buckets (id, name, public)
VALUES ('scheduled-area-images', 'scheduled-area-images', true)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANTE: Verifique se o RLS está habilitado no storage.objects
-- Se necessário, execute: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir upload de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to upload scheduled area images" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload scheduled area images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'scheduled-area-images');

-- Política para permitir leitura pública de imagens
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow public read access to scheduled area images" ON storage.objects;

CREATE POLICY "Allow public read access to scheduled area images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'scheduled-area-images');

-- Política para permitir atualização de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to update scheduled area images" ON storage.objects;

CREATE POLICY "Allow authenticated users to update scheduled area images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'scheduled-area-images')
  WITH CHECK (bucket_id = 'scheduled-area-images');

-- Política para permitir exclusão de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to delete scheduled area images" ON storage.objects;

CREATE POLICY "Allow authenticated users to delete scheduled area images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'scheduled-area-images');

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE scheduled_areas IS 'Tabela para armazenar informações de áreas de escala';
COMMENT ON COLUMN scheduled_areas.id IS 'Identificador único da área de escala (UUID)';
COMMENT ON COLUMN scheduled_areas.name IS 'Nome da área de escala (3-255 caracteres)';
COMMENT ON COLUMN scheduled_areas.description IS 'Descrição da área de escala (máximo 1000 caracteres)';
COMMENT ON COLUMN scheduled_areas.responsible_person_id IS 'ID da pessoa responsável pela área (referência à tabela persons)';
COMMENT ON COLUMN scheduled_areas.image_url IS 'URL da imagem da área de escala (opcional)';
COMMENT ON COLUMN scheduled_areas.favorite IS 'Indica se a área está marcada como favorita (padrão: false)';
COMMENT ON COLUMN scheduled_areas.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN scheduled_areas.updated_at IS 'Data e hora da última atualização do registro';

