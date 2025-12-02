-- ============================================
-- Person API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de pessoas
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(11) NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  emergency_contact VARCHAR(11) NOT NULL,
  address VARCHAR(500) NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_persons_cpf ON persons(cpf);
CREATE INDEX IF NOT EXISTS idx_persons_created_at ON persons(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Descomente as linhas abaixo se quiser habilitar RLS
-- Por padrão, a tabela será acessível apenas com autenticação via API

-- Habilitar RLS na tabela
-- ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
-- CREATE POLICY "Allow authenticated users to read persons"
--   ON persons
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Política para permitir inserção para usuários autenticados
-- CREATE POLICY "Allow authenticated users to insert persons"
--   ON persons
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
-- CREATE POLICY "Allow authenticated users to update persons"
--   ON persons
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Política para permitir exclusão para usuários autenticados
-- CREATE POLICY "Allow authenticated users to delete persons"
--   ON persons
--   FOR DELETE
--   TO authenticated
--   USING (true);

-- ============================================
-- Storage Bucket para Fotos
-- ============================================
-- Execute no SQL Editor do Supabase para criar o bucket de storage

-- Criar bucket para fotos de pessoas
INSERT INTO storage.buckets (id, name, public)
VALUES ('person-photos', 'person-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de fotos para usuários autenticados
CREATE POLICY "Allow authenticated users to upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'person-photos');

-- Política para permitir leitura pública de fotos
CREATE POLICY "Allow public read access to photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'person-photos');

-- Política para permitir atualização de fotos para usuários autenticados
CREATE POLICY "Allow authenticated users to update photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'person-photos')
  WITH CHECK (bucket_id = 'person-photos');

-- Política para permitir exclusão de fotos para usuários autenticados
CREATE POLICY "Allow authenticated users to delete photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'person-photos');

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE persons IS 'Tabela para armazenar informações de pessoas';
COMMENT ON COLUMN persons.id IS 'Identificador único da pessoa (UUID)';
COMMENT ON COLUMN persons.full_name IS 'Nome completo da pessoa (3-255 caracteres)';
COMMENT ON COLUMN persons.email IS 'Email da pessoa (único)';
COMMENT ON COLUMN persons.phone IS 'Telefone celular (10-11 dígitos, apenas números)';
COMMENT ON COLUMN persons.cpf IS 'CPF da pessoa (11 dígitos, apenas números, único)';
COMMENT ON COLUMN persons.birth_date IS 'Data de nascimento (formato YYYY-MM-DD)';
COMMENT ON COLUMN persons.emergency_contact IS 'Contato de emergência (10-11 dígitos, apenas números)';
COMMENT ON COLUMN persons.address IS 'Endereço completo (10-500 caracteres)';
COMMENT ON COLUMN persons.photo_url IS 'URL da foto da pessoa (opcional)';
COMMENT ON COLUMN persons.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN persons.updated_at IS 'Data e hora da última atualização do registro';

