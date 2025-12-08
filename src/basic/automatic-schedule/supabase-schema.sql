-- ============================================
-- Automatic Schedule Generation API - Supabase Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- IMPORTANTE: Se as tabelas já existirem com tipos incorretos,
-- você precisará dropá-las primeiro ou alterar os tipos manualmente.
-- ============================================

-- Remover tabelas dependentes primeiro (se existirem) para evitar conflitos de foreign key
DROP TABLE IF EXISTS schedule_comments CASCADE;
DROP TABLE IF EXISTS schedule_members CASCADE;
DROP TABLE IF EXISTS schedule_team_assignments CASCADE;
DROP TABLE IF EXISTS schedule_teams CASCADE;
DROP TABLE IF EXISTS schedule_groups CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS schedule_generations CASCADE;

-- Criar tabela de gerações automáticas de escalas
CREATE TABLE schedule_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('group', 'people', 'team_without_restriction', 'team_with_restriction')),
  period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('fixed', 'monthly', 'weekly', 'daily')),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  configuration JSONB NOT NULL,
  total_schedules_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES persons(id),
  CONSTRAINT check_period_dates CHECK (period_end_date >= period_start_date)
);

-- Criar tabela de escalas (schedules)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_generation_id UUID REFERENCES schedule_generations(id) ON DELETE CASCADE,
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('group', 'team', 'individual')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_datetime_range CHECK (end_datetime >= start_datetime)
);

-- Criar tabela de grupos associados a escalas
CREATE TABLE schedule_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES area_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, group_id)
);

-- Criar tabela de equipes associadas a escalas
CREATE TABLE schedule_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES area_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, team_id)
);

-- Criar tabela de atribuições de pessoas a funções em equipes (para escalas do tipo team)
CREATE TABLE schedule_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  team_role_id UUID NOT NULL REFERENCES area_team_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, person_id, team_role_id)
);

-- Criar tabela de membros de escalas (para escalas do tipo individual ou membros de grupos)
CREATE TABLE schedule_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, person_id)
);

-- Criar tabela de comentários em escalas
CREATE TABLE schedule_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 5000),
  author_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_schedule_generations_scheduled_area_id ON schedule_generations(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_schedule_generations_created_at ON schedule_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_generations_created_by ON schedule_generations(created_by);

CREATE INDEX IF NOT EXISTS idx_schedules_schedule_generation_id ON schedules(schedule_generation_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_area_id ON schedules(scheduled_area_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_datetime ON schedules(start_datetime);
CREATE INDEX IF NOT EXISTS idx_schedules_end_datetime ON schedules(end_datetime);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_datetime_range ON schedules USING GIST (tstzrange(start_datetime, end_datetime));

CREATE INDEX IF NOT EXISTS idx_schedule_groups_schedule_id ON schedule_groups(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_groups_group_id ON schedule_groups(group_id);

CREATE INDEX IF NOT EXISTS idx_schedule_teams_schedule_id ON schedule_teams(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teams_team_id ON schedule_teams(team_id);

CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_schedule_id ON schedule_team_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_person_id ON schedule_team_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_team_role_id ON schedule_team_assignments(team_role_id);

CREATE INDEX IF NOT EXISTS idx_schedule_members_schedule_id ON schedule_members(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_members_person_id ON schedule_members(person_id);
CREATE INDEX IF NOT EXISTS idx_schedule_members_responsibility_id ON schedule_members(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_schedule_members_status ON schedule_members(status);

CREATE INDEX IF NOT EXISTS idx_schedule_comments_schedule_id ON schedule_comments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_comments_author_id ON schedule_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_schedule_comments_created_at ON schedule_comments(created_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_schedule_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_schedule_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

DROP TRIGGER IF EXISTS update_schedule_members_updated_at ON schedule_members;
CREATE TRIGGER update_schedule_members_updated_at
  BEFORE UPDATE ON schedule_members
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_members_updated_at();

DROP TRIGGER IF EXISTS update_schedule_comments_updated_at ON schedule_comments;
CREATE TRIGGER update_schedule_comments_updated_at
  BEFORE UPDATE ON schedule_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_comments_updated_at();

-- ============================================
-- Comentários nas colunas
-- ============================================
COMMENT ON TABLE schedule_generations IS 'Tabela para armazenar gerações automáticas de escalas';
COMMENT ON COLUMN schedule_generations.id IS 'Identificador único da geração (UUID)';
COMMENT ON COLUMN schedule_generations.scheduled_area_id IS 'Referência à área agendada onde as escalas serão geradas';
COMMENT ON COLUMN schedule_generations.generation_type IS 'Tipo de geração: group, people, team_without_restriction, team_with_restriction';
COMMENT ON COLUMN schedule_generations.period_type IS 'Tipo de período: fixed, monthly, weekly, daily';
COMMENT ON COLUMN schedule_generations.configuration IS 'Configuração completa da geração em formato JSON';
COMMENT ON COLUMN schedule_generations.total_schedules_generated IS 'Número total de escalas geradas';

COMMENT ON TABLE schedules IS 'Tabela para armazenar escalas (geradas automaticamente ou manuais)';
COMMENT ON COLUMN schedules.schedule_generation_id IS 'Referência à geração automática (NULL para escalas manuais)';
COMMENT ON COLUMN schedules.schedule_type IS 'Tipo de escala: group, team, individual';
COMMENT ON COLUMN schedules.status IS 'Status da escala: pending, confirmed, cancelled';

COMMENT ON TABLE schedule_members IS 'Tabela para armazenar membros de escalas';
COMMENT ON COLUMN schedule_members.status IS 'Status do membro: pending, accepted, rejected';

COMMENT ON TABLE schedule_comments IS 'Tabela para armazenar comentários em escalas';
COMMENT ON COLUMN schedule_comments.content IS 'Conteúdo do comentário (1-5000 caracteres)';

