# Proposta v2: Geração Automática de Escalas de Trabalho

## Visão Geral

Sistema para geração automática de escalas de trabalho dentro de **Áreas Agendadas** (`scheduled_areas`), permitindo criar múltiplas escalas de forma automatizada com diferentes 
configurações e regras de distribuição, respeitando a estrutura de grupos, equipes, responsabilidades e ausências já existentes no sistema.

## Contexto do Sistema

### Entidades Existentes

O sistema já possui as seguintes entidades que devem ser consideradas:

1. **Áreas Agendadas** (`scheduled_areas`)
   - Contexto principal onde as escalas são geradas
   - Possui pessoa responsável (`responsible_person_id`)
   - Pode ser marcada como favorita

2. **Grupos** (`area_groups`)
   - Grupos dentro de uma área agendada
   - Membros (`area_group_members`) - pessoas associadas a grupos
   - Responsabilidades de membros (`area_group_member_responsibilities`)

3. **Equipes** (`area_teams`)
   - Equipes dentro de uma área agendada
   - Funções/Papéis (`area_team_roles`) com:
     - `responsibility_id`: Responsabilidade necessária
     - `quantity`: Quantidade de pessoas necessárias para essa função
     - `priority`: Ordem de prioridade da função
     - `is_free`: Se a função é livre (pode ser atribuída) ou fixa
   - Pessoas fixas (`area_team_role_fixed_persons`) - pessoas já atribuídas a funções específicas

4. **Responsabilidades** (`responsibilities`)
   - Responsabilidades/papéis vinculadas a uma área agendada
   - Usadas em grupos, equipes e pessoas

5. **Pessoas em Áreas** (`person_areas`)
   - Associação entre pessoas e áreas agendadas
   - Responsabilidades de pessoas (`person_area_responsibilities`)

6. **Ausências Agendadas** (`scheduled_absences`)
   - Ausências de pessoas com período (data início e fim)
   - Tipos de ausência (`absence_types`)

### Nova Entidade: Escalas

**Tabela: `schedules`**
- Representa uma escala de trabalho específica
- Vinculada a uma área agendada
- Possui data/hora de início e fim
- Pode ser gerada automaticamente ou manualmente
- Relaciona-se com grupos, equipes ou pessoas individuais

**Tabela: `automatic_schedule_generations`**
- Registro de uma geração automática de escalas
- Agrupa todas as escalas geradas em uma única operação
- Armazena configurações utilizadas na geração
- Permite rastreabilidade e gestão em lote

## Funcionalidades Principais

### 1. Geração Automática de Escalas

#### Princípios Básicos
- **Evitar repetição**: O sistema deve evitar a repetição de grupos, equipes ou pessoas em escalas consecutivas
- **Distribuição equilibrada**: Garantir que todos os grupos/equipes/pessoas sejam distribuídos de forma equilibrada ao longo do período
- **Respeitar ausências**: Considerar `scheduled_absences` para não escalar pessoas ausentes
- **Respeitar pessoas fixas**: Considerar `area_team_role_fixed_persons` quando aplicável
- **Validar responsabilidades**: Respeitar as responsabilidades cadastradas em `person_area_responsibilities` e `area_group_member_responsibilities`

#### Preview Antes de Enviar
- **Visualização prévia**: O usuário deve poder visualizar uma prévia completa do que será gerado no front-end antes de enviar para o back-end
- **Validação visual**: Permitir que o usuário revise e ajuste antes de confirmar a geração
- **Feedback imediato**: Mostrar possíveis conflitos ou problemas na distribuição antes do envio:
  - Pessoas ausentes no período
  - Conflitos de horário
  - Repetições consecutivas
  - Distribuição desequilibrada
  - Pessoas sem responsabilidades necessárias

### 2. Geração de Múltiplas Escalas

- **Período flexível**: Possibilidade de gerar várias escalas numa mesma ação
- **Seleção de intervalo**: Permitir selecionar data de início e fim do período
- **Múltiplas escalas no período**: O período pode conter várias escalas já registradas
- **Agrupamento**: Todos os registros de escala gerados devem ser agrupados a um único registro em `automatic_schedule_generations`, permitindo:
  - Rastreabilidade da geração
  - Gestão em lote (editar, excluir todas as escalas de uma geração)
  - Histórico de gerações automáticas
  - Reversão de gerações

### 3. Configurações de Geração

#### 3.1. Geração por Grupos

**Descrição**: Gera escalas atribuindo grupos completos (`area_groups`) a cada período de escala.

**Contexto do Sistema**:
- Utiliza grupos existentes em `area_groups` da área agendada selecionada
- Considera membros dos grupos (`area_group_members`)
- Pode considerar responsabilidades dos membros (`area_group_member_responsibilities`)

**Exemplo**:
- Área: "Células de Oração"
- Grupos: Grupo A, Grupo B, Grupo C
- Configuração: 1 grupo por escala
- Resultado:
  - Semana 1: Grupo A
  - Semana 2: Grupo B
  - Semana 3: Grupo C
  - Semana 4: Grupo A (ciclo se repete)

**Configurações**:
- Seleção da área agendada (`scheduled_area_id`)
- Seleção de grupos participantes (filtro por grupos da área)
- Quantidade de grupos por escala
- Ordem de distribuição:
  - **Sequencial**: Grupos em ordem definida
  - **Aleatória**: Distribuição aleatória
  - **Balanceada**: Distribuição que equilibra a frequência de cada grupo
- Considerar ausências: Excluir grupos que tenham muitos membros ausentes

#### 3.2. Geração por Equipe (Sem Restrição de Papéis)

**Descrição**: Geração de escala por equipe (`area_teams`), onde qualquer pessoa da área pode ser atribuída a qualquer papel da equipe, sem necessidade de estar cadastrada especificamente naquele papel.

**Contexto do Sistema**:
- Utiliza equipes existentes em `area_teams` da área agendada
- Utiliza funções/papéis definidos em `area_team_roles`
- Considera `quantity` de cada função (quantas pessoas são necessárias)
- Considera `priority` das funções (ordem de preenchimento)
- Respeita `area_team_role_fixed_persons` (pessoas já fixas em funções)
- Pessoas participantes vêm de `person_areas` da área agendada

**Exemplo**:
- Área: "Louvor"
- Equipe: "Equipe de Louvor Dominical"
- Funções:
  - Baterista (quantity: 1, priority: 1)
  - Tecladista (quantity: 1, priority: 2)
  - Vocalista (quantity: 2, priority: 3)
- Participantes: Todas as pessoas da área "Louvor"
- Resultado:
  - Semana 1: João (Baterista), Maria (Tecladista), Pedro e Ana (Vocalistas)
  - Semana 2: Pedro (Baterista), João (Tecladista), Maria e Ana (Vocalistas)

**Configurações**:
- Seleção da área agendada (`scheduled_area_id`)
- Seleção da equipe (`area_team_id`)
- Seleção de pessoas participantes:
  - **TODOS**: Todas as pessoas de `person_areas` da área
  - **Por grupo**: Filtrar por pessoas que pertencem a grupos específicos (`area_group_members`)
  - **Seleção individual**: Seleção manual de pessoas
- Distribuição flexível de papéis (qualquer pessoa pode assumir qualquer papel)
- Considerar ausências: Excluir pessoas com `scheduled_absences` no período

#### 3.3. Geração por Equipe (Com Restrição de Papéis)

**Descrição**: Geração de escala por equipe onde cada pessoa selecionada precisa ter a responsabilidade correspondente cadastrada.

**Contexto do Sistema**:
- Utiliza equipes e funções como na geração sem restrição
- Valida responsabilidades através de:
  - `person_area_responsibilities`: Responsabilidades da pessoa na área
  - `area_group_member_responsibilities`: Responsabilidades da pessoa no grupo (se aplicável)
- Cada função (`area_team_roles`) tem uma `responsibility_id` associada
- Apenas pessoas com essa responsabilidade podem ser atribuídas à função

**Exemplo**:
- Área: "Louvor"
- Equipe: "Equipe de Louvor Dominical"
- Funções:
  - Baterista (responsibility_id: "Baterista", quantity: 1)
  - Tecladista (responsibility_id: "Tecladista", quantity: 1)
  - Vocalista (responsibility_id: "Vocalista", quantity: 2)
- Pessoas e suas responsabilidades:
  - João: Baterista (em `person_area_responsibilities`)
  - Maria: Tecladista, Vocalista
  - Mariana: Vocalista
  - Bruno: Tecladista, Vocalista, Baixista
- Resultado possível:
  - Baterista: Apenas João (único com essa responsabilidade)
  - Tecladista: Maria ou Bruno
  - Vocalista: Maria, Mariana ou Bruno

**Configurações**:
- Seleção da área agendada (`scheduled_area_id`)
- Seleção da equipe (`area_team_id`)
- Seleção de pessoas participantes (TODOS, por grupo ou individual)
- Validação obrigatória de responsabilidades
- Algoritmo de matching entre pessoas e papéis necessários
- Considerar ausências
- Considerar pessoas fixas (`area_team_role_fixed_persons`)

### 4. Seleção de Participantes

#### 4.1. Opção "TODOS"
- Incluir todas as pessoas de `person_areas` da área agendada selecionada
- Considerar filtros adicionais (ausências, grupos, etc.)

#### 4.2. Seleção por Grupo
- Filtrar participantes por grupos específicos (`area_groups`)
- Considerar apenas membros dos grupos selecionados (`area_group_members`)
- Pode selecionar múltiplos grupos

#### 4.3. Seleção Individual
- Permitir seleção manual de pessoas específicas
- Lista de pessoas baseada em `person_areas` da área agendada
- Pode combinar com filtros (grupos, responsabilidades)

### 5. Tipos de Período de Escala

#### 5.1. Período Fixo

**Descrição**: Escala única com data e hora específicas de início e fim.

**Exemplo**:
- Início: 2025-01-01 14:00
- Fim: 2025-01-01 16:00
- Gera: 1 escala

#### 5.2. Período Mensal

**Descrição**: Escala que se repete mensalmente dentro de um intervalo, sempre no mesmo dia do mês.

**Exemplo**:
- Período total: 2025-01-01 a 2025-12-31
- Data base: 2025-01-01 00:00
- Duração: 1 dia
- Próximas ocorrências: 2025-02-01, 2025-03-01, ..., 2025-12-01
- Gera: 12 escalas

**Configurações**:
- Data de início do período
- Data de fim do período
- Data/hora base da escala
- Duração da escala

#### 5.3. Período Semanal

**Descrição**: Escala que se repete semanalmente, gerando múltiplas escalas dentro do período.

**Exemplo**:
- Período total: 2025-01-01 a 2025-01-31
- Data/hora base: 2025-01-01 00:00
- Duração: 7 dias
- Escalas geradas:
  - Semana 1: 2025-01-01 00:00 - 2025-01-07 23:59
  - Semana 2: 2025-01-08 00:00 - 2025-01-14 23:59
  - Semana 3: 2025-01-15 00:00 - 2025-01-21 23:59
  - Semana 4: 2025-01-22 00:00 - 2025-01-28 23:59

**Configurações**:
- Data de início do período
- Data de fim do período
- Data/hora base da primeira escala
- Duração de cada escala (em dias)
- Intervalo entre escalas (padrão: 7 dias)

#### 5.4. Período Diário

**Descrição**: Escala que se repete diariamente dentro de um intervalo, com possibilidade de restringir dias da semana.

**Exemplo**:
- Período total: 2025-01-01 a 2025-01-31
- Restrição: Apenas quartas-feiras
- Horário: 19:00 - 21:00
- Escalas geradas:
  - 2025-01-01 19:00 - 2025-01-01 21:00 (quarta)
  - 2025-01-08 19:00 - 2025-01-08 21:00 (quarta)
  - 2025-01-15 19:00 - 2025-01-15 21:00 (quarta)
  - 2025-01-22 19:00 - 2025-01-22 21:00 (quarta)
  - 2025-01-29 19:00 - 2025-01-29 21:00 (quarta)

**Configurações adicionais**:
- Seleção de dias da semana (domingo, segunda, terça, quarta, quinta, sexta, sábado)
- Horário padrão para cada dia (início e fim)
- Exceções de datas:
  - Feriados a excluir
  - Datas específicas a excluir
  - Datas específicas a incluir (mesmo que não seja o dia selecionado)

### 6. Consideração de Ausências

O sistema deve considerar `scheduled_absences` ao gerar escalas:

- **Verificação de sobreposição**: Não escalar pessoas que tenham ausências que sobreponham o período da escala
- **Tipos de ausência**: Considerar todos os tipos de ausência ativos (`absence_types.active = true`)
- **Feedback no preview**: Indicar quais pessoas estão ausentes e não podem ser escaladas
- **Ajuste automático**: Quando possível, substituir automaticamente pessoas ausentes

### 7. Listagem de Escalas

#### Visualização
- **Lista de escalas geradas**: Exibir todas as escalas criadas (automáticas e manuais)
- **Informações exibidas**:
  - Data e horário da escala (início e fim)
  - Área agendada associada
  - Tipo de escala:
    - Por grupo: Grupos atribuídos
    - Por equipe: Equipe e pessoas com seus papéis
  - Pessoas participantes (quando aplicável)
  - Papéis/responsabilidades atribuídos (quando aplicável)
  - Status da escala (agendada, em andamento, concluída)
  - Tipo de geração (automática ou manual)
  - Agrupamento: Quando gerada automaticamente, mostrar o registro de `automatic_schedule_generations`

#### Filtros e Busca
- Filtrar por área agendada (`scheduled_area_id`)
- Filtrar por período (data início e fim)
- Filtrar por pessoa (`person_id`)
- Filtrar por grupo (`area_group_id`)
- Filtrar por equipe (`area_team_id`)
- Filtrar por tipo de geração (automática/manual)
- Filtrar por geração automática específica (`automatic_schedule_generation_id`)
- Busca por texto livre (nome da área, pessoas, grupos, equipes)

#### Ações
- Visualizar detalhes da escala
- Editar escala (quando permitido)
- Excluir escala (quando permitido)
- Excluir todas as escalas de uma geração automática
- Duplicar escala
- Exportar lista (CSV, PDF, Excel)
- Visualizar histórico de gerações automáticas

## Fluxo de Uso

### 1. Acessar Geração Automática
- Usuário acessa a área de escalas de uma área agendada específica
- Seleciona opção "Gerar Escalas Automaticamente"

### 2. Configurar Geração
- **Seleção de área agendada**: Escolhe a área onde as escalas serão geradas (se não estiver já no contexto)
- **Tipo de geração**: Seleciona tipo (por grupos, por equipe sem restrição, por equipe com restrição)
- **Configurações específicas**:
  - Por grupos: Seleciona grupos, quantidade por escala, ordem
  - Por equipe: Seleciona equipe, pessoas participantes, modo de restrição
- **Seleção de participantes**: Define quem participará (TODOS, por grupo, individual)
- **Tipo de período**: Seleciona (Fixo, Mensal, Semanal, Diário)
- **Configurações de período**: Define datas, horários, restrições, exceções

### 3. Visualizar Preview
- Sistema gera preview das escalas que serão criadas
- Preview mostra:
  - Lista de todas as escalas que serão geradas
  - Distribuição de grupos/pessoas/papéis
  - Indicadores visuais:
    - ✅ Distribuição equilibrada
    - ⚠️ Repetições consecutivas
    - ❌ Pessoas ausentes
    - ❌ Conflitos de responsabilidades
    - ❌ Distribuição desequilibrada
- Usuário revisa a distribuição
- Sistema indica possíveis problemas
- Usuário pode ajustar configurações e regenerar preview

### 4. Confirmar e Gerar
- Usuário confirma a geração
- Sistema envia requisição para back-end
- Back-end valida e cria:
  - Registro em `automatic_schedule_generations`
  - Múltiplos registros em `schedules` vinculados à geração
- Sistema agrupa todas as escalas geradas
- Feedback de sucesso/erro é exibido

### 5. Visualizar Resultado
- Escalas aparecem na listagem
- Podem ser filtradas por grupo de geração automática
- Podem ser editadas individualmente (se permitido)
- Podem ser excluídas em lote através da geração automática

## Estrutura de Dados Proposta

### Tabela: `schedules`

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  automatic_schedule_generation_id UUID REFERENCES automatic_schedule_generations(id) ON DELETE SET NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('group', 'team', 'individual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES persons(id),
  CONSTRAINT check_datetime_range CHECK (end_datetime >= start_datetime)
);
```

### Tabela: `schedule_groups`

```sql
CREATE TABLE schedule_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES area_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, group_id)
);
```

### Tabela: `schedule_team_assignments`

```sql
CREATE TABLE schedule_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES area_teams(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  team_role_id UUID NOT NULL REFERENCES area_team_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, person_id, team_role_id)
);
```

### Tabela: `automatic_schedule_generations`

```sql
CREATE TABLE automatic_schedule_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_area_id UUID NOT NULL REFERENCES scheduled_areas(id) ON DELETE CASCADE,
  generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('group', 'team_without_restriction', 'team_with_restriction')),
  configuration JSONB NOT NULL, -- Armazena todas as configurações utilizadas
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('fixed', 'monthly', 'weekly', 'daily')),
  total_schedules_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES persons(id)
);
```

**Nota**: A estrutura acima é uma proposta. A implementação final pode variar conforme necessidade.

## Requisitos Técnicos

### Front-end
- Interface intuitiva para configuração
- Preview interativo e responsivo
- Validação em tempo real
- Feedback visual claro
- Tratamento de erros
- Integração com APIs existentes de áreas, grupos, equipes, pessoas

### Back-end
- Endpoint para geração automática de escalas
- Algoritmo de distribuição evitando repetições
- Validação de regras de negócio:
  - Verificar existência de grupos/equipes/pessoas
  - Validar responsabilidades quando necessário
  - Considerar ausências
  - Respeitar pessoas fixas em equipes
- Agrupamento de escalas geradas
- Histórico de gerações automáticas
- Endpoints para gestão de escalas (CRUD)
- Endpoints para listagem e filtros

### Banco de Dados
- Tabelas conforme estrutura proposta acima
- Índices para performance em consultas:
  - `schedules(scheduled_area_id, start_datetime)`
  - `schedules(automatic_schedule_generation_id)`
  - `schedule_team_assignments(schedule_id, person_id)`
  - `scheduled_absences(person_id, start_date, end_date)`
- Relacionamentos e constraints apropriados

## Considerações de UX/UI

- **Wizard/Stepper**: Usar fluxo passo a passo para configuração
- **Preview em tempo real**: Atualizar preview conforme configurações mudam
- **Indicadores visuais**: Mostrar claramente:
  - Repetições consecutivas
  - Conflitos (ausências, responsabilidades)
  - Distribuições equilibradas/desequilibradas
  - Pessoas/grupos disponíveis vs. escalados
- **Feedback claro**: Mensagens de sucesso/erro bem definidas
- **Cancelamento**: Permitir cancelar a geração a qualquer momento
- **Histórico**: Permitir visualizar e reutilizar configurações anteriores
- **Integração**: Interface deve se integrar naturalmente com as telas existentes de áreas, grupos e equipes

## Validações Necessárias

### Validações de Entrada
- Verificar se a área agendada existe e está acessível
- Verificar se há grupos/equipes suficientes para a distribuição
- Validar se pessoas têm os papéis necessários (quando aplicável)
- Verificar se há pessoas suficientes para preencher todas as funções
- Validar período de datas (início < fim)
- Verificar se não há escalas duplicadas no mesmo período

### Validações de Negócio
- Verificar conflitos de horário com escalas existentes
- Considerar ausências (`scheduled_absences`) no período
- Respeitar pessoas fixas em equipes (`area_team_role_fixed_persons`)
- Validar responsabilidades quando em modo restrito
- Verificar se grupos têm membros suficientes
- Validar quantidade de pessoas por função (`area_team_roles.quantity`)

### Validações de Distribuição
- Evitar repetições consecutivas
- Garantir distribuição equilibrada
- Considerar histórico de escalas anteriores para balanceamento

## Melhorias Futuras

- Machine Learning para otimizar distribuições baseado em histórico
- Sugestões automáticas de melhor distribuição
- Exportação de escalas em diferentes formatos (PDF, Excel, Calendário iCal)
- Notificações automáticas para participantes (email, SMS, push)
- Integração com calendários externos (Google Calendar, Outlook)
- Análise de histórico e padrões de distribuição
- Dashboard de métricas de distribuição
- Regras customizáveis de distribuição por área agendada
- Suporte a múltiplas equipes por escala
- Suporte a escalas híbridas (grupos + equipes)



