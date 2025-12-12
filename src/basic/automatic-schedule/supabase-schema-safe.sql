-- ============================================
-- Automatic Schedule Generation API - Supabase Schema (Safe Version)
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================
-- Esta versão verifica e altera tipos de colunas se necessário
-- Use esta versão se você já tem dados nas tabelas e não quer perdê-los
-- ============================================

-- Verificar e alterar tipo da tabela schedules se necessário
DO $$
BEGIN
  -- Se a tabela schedules existe mas com tipo errado
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'schedules'
  ) THEN
    -- Verificar se o tipo da coluna id está incorreto
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'schedules' 
      AND column_name = 'id' 
      AND data_type != 'uuid'
    ) THEN
      -- Alterar o tipo da coluna id para UUID
      -- NOTA: Isso só funciona se a tabela estiver vazia ou se os valores puderem ser convertidos
      ALTER TABLE schedules ALTER COLUMN id TYPE UUID USING id::text::uuid;
    END IF;
  END IF;
END $$;

-- Criar tabela de gerações automáticas de escalas
CREATE TABLE IF NOT EXISTS schedule_generations (
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

-- Criar tabela de escalas (schedules) - garantir que id seja UUID
CREATE TABLE IF NOT EXISTS schedules (
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

-- Garantir que a coluna id seja UUID (caso a tabela já exista)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' 
    AND column_name = 'id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE schedules ALTER COLUMN id TYPE UUID USING id::text::uuid;
  END IF;
END $$;

-- Criar tabela de grupos associados a escalas
CREATE TABLE IF NOT EXISTS schedule_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES area_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, group_id)
);

-- Criar tabela de equipes associadas a escalas
CREATE TABLE IF NOT EXISTS schedule_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES area_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, team_id)
);

-- Criar tabela de atribuições de pessoas a funções em equipes (para escalas do tipo team)
CREATE TABLE IF NOT EXISTS schedule_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  team_role_id UUID NOT NULL REFERENCES area_team_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, person_id, team_role_id)
);

-- Criar tabela de membros de escalas (para escalas do tipo individual ou membros de grupos)
CREATE TABLE IF NOT EXISTS schedule_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  present BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, person_id)
);

-- Adicionar coluna present se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_members' 
    AND column_name = 'present'
  ) THEN
    ALTER TABLE schedule_members ADD COLUMN present BOOLEAN DEFAULT NULL;
  END IF;
END $$;

-- Criar tabela de comentários em escalas
CREATE TABLE IF NOT EXISTS schedule_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 5000),
  author_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de logs de mudanças em schedules e schedule_members
CREATE TABLE IF NOT EXISTS schedule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  schedule_member_id UUID REFERENCES schedule_members(id) ON DELETE SET NULL,
  person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'member_added',
    'member_removed',
    'member_status_changed',
    'member_present_changed',
    'member_responsibility_changed',
    'schedule_start_date_changed',
    'schedule_end_date_changed',
    'schedule_status_changed',
    'team_changed',
    'team_member_added',
    'team_member_removed'
  )),
  old_value JSONB,
  new_value JSONB,
  message TEXT,
  changed_by UUID REFERENCES persons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna message se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_logs' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE schedule_logs ADD COLUMN message TEXT;
  END IF;
END $$;

-- Remover tabela antiga se existir
DROP TABLE IF EXISTS schedule_members_logs CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_schedule_logs_schedule_id ON schedule_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_schedule_member_id ON schedule_logs(schedule_member_id);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_person_id ON schedule_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_change_type ON schedule_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_created_at ON schedule_logs(created_at DESC);

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
COMMENT ON COLUMN schedule_members.present IS 'Indica se a pessoa esteve presente (true) ou não (false), ou NULL se ainda não foi marcado';

COMMENT ON TABLE schedule_comments IS 'Tabela para armazenar comentários em escalas';
COMMENT ON COLUMN schedule_comments.content IS 'Conteúdo do comentário (1-5000 caracteres)';

COMMENT ON TABLE schedule_logs IS 'Tabela para armazenar logs de mudanças em schedules e schedule_members';
COMMENT ON COLUMN schedule_logs.change_type IS 'Tipo de mudança: member_added, member_removed, member_status_changed, member_present_changed, member_responsibility_changed, schedule_start_date_changed, schedule_end_date_changed, schedule_status_changed, team_changed, team_member_added, team_member_removed';
COMMENT ON COLUMN schedule_logs.old_value IS 'Valor anterior em formato JSON';
COMMENT ON COLUMN schedule_logs.new_value IS 'Novo valor em formato JSON';



