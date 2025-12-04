-- ============================================
-- Responsibilities API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de responsabilidades
CREATE TABLE IF NOT EXISTS responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000),
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE RESTRICT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_responsibilities_scheduled_area_id ON responsibilities(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_created_at ON responsibilities(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_responsibilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_responsibilities_updated_at ON responsibilities;
CREATE TRIGGER update_responsibilities_updated_at
  BEFORE UPDATE ON responsibilities
  FOR EACH ROW
  EXECUTE FUNCTION update_responsibilities_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS na tabela
-- ALTER TABLE responsibilities ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read responsibilities"
--   ON responsibilities
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert responsibilities"
--   ON responsibilities
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update responsibilities"
--   ON responsibilities
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete responsibilities"
--   ON responsibilities
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Storage Bucket para Imagens
-- ============================================
-- Execute no SQL Editor do Supabase para criar o bucket de storage

-- Criar bucket para imagens de responsabilidades
INSERT INTO storage.buckets (id, name, public)
VALUES ('responsibility-images', 'responsibility-images', true)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANTE: Verifique se o RLS está habilitado no storage.objects
-- Se necessário, execute: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir upload de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to upload responsibility images" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload responsibility images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'responsibility-images');

-- Política para permitir leitura pública de imagens
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow public read access to responsibility images" ON storage.objects;

CREATE POLICY "Allow public read access to responsibility images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'responsibility-images');

-- Política para permitir atualização de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to update responsibility images" ON storage.objects;

CREATE POLICY "Allow authenticated users to update responsibility images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'responsibility-images')
  WITH CHECK (bucket_id = 'responsibility-images');

-- Política para permitir exclusão de imagens para usuários autenticados
-- Remove política antiga se existir
DROP POLICY IF EXISTS "Allow authenticated users to delete responsibility images" ON storage.objects;

CREATE POLICY "Allow authenticated users to delete responsibility images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'responsibility-images');

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE responsibilities IS 'Tabela para armazenar informações de responsabilidades vinculadas a áreas agendadas';
COMMENT ON COLUMN responsibilities.id IS 'Identificador único da responsabilidade (UUID)';
COMMENT ON COLUMN responsibilities.name IS 'Nome da responsabilidade (3-255 caracteres)';
COMMENT ON COLUMN responsibilities.description IS 'Descrição da responsabilidade (máximo 1000 caracteres)';
COMMENT ON COLUMN responsibilities.scheduled_area_id IS 'ID da área agendada (referência à tabela scheduled_areas)';
COMMENT ON COLUMN responsibilities.image_url IS 'URL da imagem da responsabilidade (opcional)';
COMMENT ON COLUMN responsibilities.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN responsibilities.updated_at IS 'Data e hora da última atualização do registro';

