# Proposta: Geração Automática de Escalas de Trabalho

## Visão Geral

Sistema para geração automática de escalas de trabalho dentro da área de escalas, permitindo criar múltiplas escalas de forma automatizada com diferentes configurações e regras de distribuição.

## Funcionalidades Principais

### 1. Geração Automática de Escalas

#### Princípios Básicos
- **Evitar repetição**: O sistema deve evitar a repetição de grupos ou pessoas em escalas consecutivas
- **Distribuição equilibrada**: Garantir que todos os grupos/pessoas sejam distribuídos de forma equilibrada ao longo do período

#### Preview Antes de Enviar
- **Visualização prévia**: O usuário deve poder visualizar uma prévia completa do que será gerado no front-end antes de enviar para o back-end
- **Validação visual**: Permitir que o usuário revise e ajuste antes de confirmar a geração
- **Feedback imediato**: Mostrar possíveis conflitos ou problemas na distribuição antes do envio

### 2. Geração de Múltiplas Escalas

- **Período flexível**: Possibilidade de gerar várias escalas numa mesma ação
- **Seleção de intervalo**: Permitir selecionar data de início e fim do período
- **Múltiplas escalas no período**: O período pode conter várias escalas já registradas
- **Agrupamento**: Todos os registros de escala gerados devem ser agrupados a um único registro da geração automática, permitindo rastreabilidade e gestão em lote

### 3. Configurações de Geração

#### 3.1. Geração por Grupos

**Descrição**: Define quantos grupos por escala serão utilizados.

**Exemplo**:
- Grupo 1 → Primeira semana
- Grupo 2 → Segunda semana
- Grupo 3 → Terceira semana
- (ciclo se repete)

**Configurações**:
- Seleção de grupos participantes
- Quantidade de grupos por escala
- Ordem de distribuição (sequencial, aleatória, balanceada)

#### 3.2. Geração por Equipe (Sem Restrição de Papéis)

**Descrição**: Geração de escala por equipe, onde qualquer pessoa pode estar em qualquer papel da equipe, sem necessidade de estar cadastrada especificamente naquele papel.

**Exemplo**:
- **Primeira semana**: João (quebra-gelo), Maria (palavra na célula)
- **Segunda semana**: Pedro (quebra-gelo), João (palavra na célula)

**Configurações**:
- Seleção de pessoas participantes (TODOS ou grupo específico)
- Definição da estrutura da equipe (papéis necessários)
- Distribuição flexível de papéis

#### 3.3. Geração por Equipe (Com Restrição de Papéis)

**Descrição**: Geração de escala por equipe onde cada pessoa selecionada precisa estar cadastrada no papel da equipe correspondente.

**Exemplo**:
- **Pessoas e seus papéis**:
  - João: Baterista, Tecladista
  - Maria: Tecladista, Vocalista
  - Mariana: Vocalista
  - Bruno: Tecladista, Vocalista, Baixista

- **Estrutura da equipe**: 1 Baterista, 1 Tecladista, 1 Vocalista

- **Distribuição possível**:
  - Baterista: Apenas João (único com esse papel)
  - Tecladista: João, Maria ou Bruno
  - Vocalista: Maria, Mariana ou Bruno

**Configurações**:
- Seleção de pessoas participantes (TODOS ou grupo específico)
- Validação de papéis cadastrados
- Distribuição respeitando as competências de cada pessoa
- Algoritmo de matching entre pessoas e papéis necessários

### 4. Seleção de Participantes

- **Opção "TODOS"**: Incluir todas as pessoas/grupos disponíveis
- **Seleção por grupo**: Filtrar participantes por grupo específico
- **Seleção individual**: Permitir seleção manual de pessoas específicas (quando aplicável)

### 5. Tipos de Período de Escala

#### 5.1. Período Fixo

**Descrição**: Escala única com data e hora específicas de início e fim.

**Exemplo**:
- Início: 2025-01-01 14:00
- Fim: 2025-01-01 16:00

#### 5.2. Período Mensal

**Descrição**: Escala que se repete mensalmente dentro de um intervalo.

**Exemplo**:
- Início: 2025-01-01 00:00
- Fim: 2025-01-31 23:59
- Próximas ocorrências: 2025-02-01, 2025-03-01, etc.

#### 5.3. Período Semanal

**Descrição**: Escala que se repete semanalmente, gerando múltiplas escalas dentro do período.

**Exemplo**:
- Período total: 2025-01-01 a 2025-01-31
- Escalas geradas:
  - Semana 1: 2025-01-01 00:00 - 2025-01-07 23:59
  - Semana 2: 2025-01-08 00:00 - 2025-01-14 23:59
  - Semana 3: 2025-01-15 00:00 - 2025-01-21 23:59
  - Semana 4: 2025-01-22 00:00 - 2025-01-28 23:59

#### 5.4. Período Diário

**Descrição**: Escala que se repete diariamente dentro de um intervalo, com possibilidade de restringir dias da semana.

**Exemplo**:
- Período total: 2025-01-01 a 2025-01-31
- Restrição: Apenas quartas-feiras
- Escalas geradas:
  - 2025-01-01 00:00 - 2025-01-01 23:59 (quarta)
  - 2025-01-08 00:00 - 2025-01-08 23:59 (quarta)
  - 2025-01-15 00:00 - 2025-01-15 23:59 (quarta)
  - 2025-01-22 00:00 - 2025-01-22 23:59 (quarta)
  - 2025-01-29 00:00 - 2025-01-29 23:59 (quarta)

**Configurações adicionais**:
- Seleção de dias da semana (domingo, segunda, terça, quarta, quinta, sexta, sábado)
- Horário padrão para cada dia
- Exceções de datas (feriados, dias específicos a excluir)

### 6. Listagem de Escalas

#### Visualização
- **Lista de escalas geradas**: Exibir todas as escalas criadas (automáticas e manuais)
- **Informações exibidas**:
  - Data e horário da escala
  - Pessoas participantes
  - Papéis atribuídos (quando aplicável)
  - Grupo ou equipe associada
  - Status da escala (agendada, em andamento, concluída)
  - Tipo de geração (automática ou manual)
  - Agrupamento (quando gerada automaticamente, mostrar o grupo de geração)

#### Filtros e Busca
- Filtrar por período
- Filtrar por pessoa
- Filtrar por grupo/equipe
- Filtrar por tipo de geração (automática/manual)
- Busca por texto livre

#### Ações
- Visualizar detalhes da escala
- Editar escala (quando permitido)
- Excluir escala (quando permitido)
- Duplicar escala
- Exportar lista

## Fluxo de Uso

### 1. Acessar Geração Automática
- Usuário acessa a área de escalas
- Seleciona opção "Gerar Escalas Automaticamente"

### 2. Configurar Geração
- Seleciona tipo de geração (por grupos, por equipe sem restrição, por equipe com restrição)
- Configura parâmetros específicos do tipo escolhido
- Seleciona participantes (TODOS ou grupo específico)
- Define tipo de período (Fixo, Mensal, Semanal, Diário)
- Configura datas e horários
- Aplica restrições (dias da semana, exceções, etc.)

### 3. Visualizar Preview
- Sistema gera preview das escalas que serão criadas
- Usuário revisa a distribuição
- Sistema indica possíveis problemas (repetições, conflitos, etc.)
- Usuário pode ajustar configurações e regenerar preview

### 4. Confirmar e Gerar
- Usuário confirma a geração
- Sistema envia requisição para back-end
- Back-end valida e cria as escalas
- Sistema agrupa todas as escalas geradas em um único registro de geração automática
- Feedback de sucesso/erro é exibido

### 5. Visualizar Resultado
- Escalas aparecem na listagem
- Podem ser filtradas por grupo de geração automática
- Podem ser editadas individualmente (se permitido)

## Requisitos Técnicos

### Front-end
- Interface intuitiva para configuração
- Preview interativo e responsivo
- Validação em tempo real
- Feedback visual claro
- Tratamento de erros

### Back-end
- Endpoint para geração automática de escalas
- Algoritmo de distribuição evitando repetições
- Validação de regras de negócio
- Agrupamento de escalas geradas
- Histórico de gerações automáticas

### Banco de Dados
- Tabela para armazenar registros de geração automática
- Relacionamento entre escalas e geração automática
- Índices para performance em consultas

## Considerações de UX/UI

- **Wizard/Stepper**: Usar fluxo passo a passo para configuração
- **Preview em tempo real**: Atualizar preview conforme configurações mudam
- **Indicadores visuais**: Mostrar claramente repetições, conflitos e distribuições
- **Feedback claro**: Mensagens de sucesso/erro bem definidas
- **Cancelamento**: Permitir cancelar a geração a qualquer momento
- **Histórico**: Permitir visualizar e reutilizar configurações anteriores

## Validações Necessárias

- Verificar se há pessoas/grupos suficientes para a distribuição
- Validar se pessoas têm os papéis necessários (quando aplicável)
- Verificar conflitos de horário
- Validar período de datas
- Verificar se não há escalas duplicadas
- Validar regras de negócio específicas do domínio

## Melhorias Futuras

- Machine Learning para otimizar distribuições
- Sugestões automáticas de melhor distribuição
- Exportação de escalas em diferentes formatos (PDF, Excel, Calendário)
- Notificações automáticas para participantes
- Integração com calendários externos
- Análise de histórico e padrões de distribuição

