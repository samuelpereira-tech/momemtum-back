# Proposta: Geração Automática de Escalas de Trabalho - Versão 3

## Histórico de Versões

- **v1**: Proposta inicial com especificação de requisitos
- **v2**: (Não encontrada)
- **v3**: Documentação completa das implementações realizadas, incluindo todas as melhorias de UI/UX, regras de negócio e integrações com APIs

---

## Visão Geral

Sistema para geração automática de escalas de trabalho dentro da área de escalas, permitindo criar múltiplas escalas de forma automatizada com diferentes configurações e regras de distribuição. Esta versão documenta todas as funcionalidades implementadas, incluindo integração com APIs existentes, algoritmos de balanceamento, e melhorias de interface.

---

## Funcionalidades Implementadas

### 1. Wizard de Geração em 5 Etapas

O sistema implementa um fluxo wizard (stepper) com 5 etapas sequenciais:

#### **Etapa 1: Seleção do Tipo de Geração**
- **Por Grupos**: Gera escalas atribuindo grupos completos a cada período
- **Por Equipe (Sem Restrição)**: Qualquer pessoa pode assumir qualquer papel
- **Por Equipe (Com Restrição)**: Apenas pessoas com responsabilidade específica podem assumir o papel

#### **Etapa 2: Configurações**
- **Para Grupos**:
  - Seleção múltipla de grupos participantes
  - Quantidade de grupos por escala
  - Ordem de distribuição (Sequencial, Aleatória, Balanceada)
  - Opção para considerar ausências
  
- **Para Equipes**:
  - Seleção de equipe
  - Exibição compacta e elegante dos papéis da equipe com:
    - Imagem da função/responsabilidade
    - Prioridade do papel
    - Quantidade de pessoas necessárias
    - Indicador de pessoa fixa (badge "Fixa")
  - Layout em grid responsivo (máximo 2 colunas)
  - Opção para validar responsabilidades obrigatoriamente (modo restrito)
  - Opção para considerar ausências

#### **Etapa 3: Seleção de Participantes**
- **Modo "TODOS"**: Inclui todas as pessoas da área
- **Modo "Por Grupo"**: Filtra participantes por grupos específicos (seleção múltipla)
- **Modo "Individual"**: Seleção manual de pessoas específicas
- Para geração por grupos, esta etapa é pulada automaticamente

#### **Etapa 4: Configuração de Período**
- **Tipo de Período**:
  - **Fixo**: Escala única com data/hora específicas
  - **Semanal**: Repete semanalmente com configuração de duração e intervalo
  - **Mensal**: Repete mensalmente
  - **Diário**: Repete diariamente com restrições de dias da semana e horários
  
- **Configurações por Tipo**:
  - Data de início e fim do período
  - Para fixo: Data/hora de início e fim
  - Para semanal: Duração de cada escala e intervalo entre escalas
  - Para mensal: Duração de cada escala
  - Para diário: Horário de início/fim e seleção de dias da semana

#### **Etapa 5: Preview e Confirmação**
- Visualização completa de todas as escalas que serão geradas
- Exibição detalhada de grupos com:
  - Nome do grupo
  - Lista de membros com fotos
  - Papéis/responsabilidades de cada membro com imagens
  - Mensagem quando não há membros cadastrados
- Exibição de atribuições de equipe com:
  - Papel atribuído
  - Pessoa atribuída
  - Indicadores de avisos e erros
- Resumo estatístico:
  - Total de escalas
  - Total de participantes
  - Quantidade de avisos
  - Quantidade de erros
  - Status de balanceamento da distribuição
- Botão flutuante "Ir para Confirmar" que:
  - Aparece quando o botão de confirmação não está visível
  - Desaparece automaticamente quando o botão de confirmação entra na viewport
  - Segue o scroll da página
  - Implementado com `IntersectionObserver` para performance

---

## Integração com APIs Existentes

### APIs Integradas

O sistema integra-se completamente com as seguintes APIs:

1. **`groupService`**: 
   - Listagem de grupos da área
   - Carregamento de todos os grupos (com paginação)

2. **`teamService`**:
   - Listagem de equipes da área
   - Carregamento de todas as equipes (com paginação)
   - Detalhes de equipes incluindo papéis, prioridades, quantidades e pessoas fixas

3. **`personAreaService`**:
   - Listagem de pessoas da área
   - Carregamento de todas as pessoas (com paginação)
   - Informações de pessoas incluindo fotos e responsabilidades

4. **`groupMemberService`**:
   - Listagem de membros de grupos
   - Carregamento de membros quando necessário (geração por grupo ou seleção por grupo)
   - Informações de membros incluindo responsabilidades específicas do grupo

5. **`scheduledAbsenceService`**:
   - Listagem de ausências agendadas
   - Carregamento de todas as ausências para validação

6. **`responsibilityService`**:
   - Listagem de responsabilidades da área
   - Carregamento de todas as responsabilidades (com paginação)
   - Informações de responsabilidades incluindo imagens

### Tratamento de Paginação

Todas as APIs que retornam dados paginados são tratadas automaticamente:
- Funções `loadAll*` carregam todos os registros iterando sobre as páginas
- Cache implementado via `withCache` para otimizar requisições
- Estados de loading durante o carregamento

### Mock Services

Apenas a função `confirmGenerationMock` permanece como mock, aguardando implementação da API real de confirmação de geração.

---

## Algoritmos de Geração Implementados

### 1. Algoritmo de Atribuição de Papéis

#### **Priorização de Pessoas Fixas**
- Pessoas fixas têm **prioridade máxima** sobre todas as outras regras
- Pessoas fixas são atribuídas primeiro, antes de qualquer outro algoritmo
- **Regra especial**: Pessoas fixas são incluídas mesmo que não estejam no grupo selecionado (override da regra de grupo)
- Pessoas fixas são excluídas do pool de pessoas disponíveis para os slots restantes

#### **Validação de Responsabilidades**

**Modo "Por Grupo" (`participantSelection === 'by_group'`)**:
- Usa **APENAS** as responsabilidades cadastradas no grupo para cada pessoa
- Não considera responsabilidades gerais da área
- Se uma pessoa não tem a responsabilidade no grupo, não pode ser atribuída ao papel
- Pessoas fixas têm suas responsabilidades da área incluídas mesmo que não estejam no grupo

**Modo "TODOS" ou "Individual"**:
- Combina responsabilidades da área com responsabilidades dos grupos
- Uma pessoa pode ter responsabilidades de múltiplas fontes

**Modo "Com Restrição" (`generationType === 'team_with_restriction'`)**:
- Valida obrigatoriamente se a pessoa tem a responsabilidade correspondente ao papel
- Se não houver pessoa elegível, deixa o slot vazio (`[Não atribuído]`)

#### **Algoritmo de Balanceamento e Alternância**

Para evitar que uma pessoa seja consistentemente deixada de fora:

1. **Histórico de Atribuições**: Mantém um mapa `assignmentHistory` que rastreia quantas vezes cada pessoa foi atribuída a cada papel

2. **Ordenação por Menor Contagem**: 
   - Pessoas com menos atribuições têm prioridade
   - Em caso de empate, usa rotação baseada no `scheduleIndex` para garantir alternância

3. **Atualização do Histórico**: Após cada atribuição, atualiza o contador no histórico

4. **Resultado**: Garante que todas as pessoas elegíveis tenham oportunidades iguais de serem escaladas

#### **Tratamento de Ausências**

- Filtra pessoas que têm ausências agendadas que sobrepõem o período da escala
- Considera apenas se `considerAbsences === true`
- Ausências são verificadas comparando datas de início/fim

#### **Tratamento de Atribuições Vazias**

- Se não houver pessoa elegível para um papel:
  - Cria atribuição vazia com `personId: ''` e `personName: '[Não atribuído]'`
  - Marca como erro no preview
  - Não tenta atribuir pessoa incorreta como fallback

### 2. Geração de Escalas por Período

#### **Período Fixo**
- Gera uma única escala com data/hora específicas

#### **Período Semanal**
- Gera múltiplas escalas dentro do período
- Cada escala tem duração configurável
- Intervalo entre escalas configurável
- Distribui grupos/pessoas de forma balanceada entre as escalas

#### **Período Mensal**
- Gera escalas mensais dentro do período
- Cada escala tem duração configurável
- Distribui grupos/pessoas de forma balanceada

#### **Período Diário**
- Gera escalas diárias dentro do período
- Respeita restrições de dias da semana selecionados
- Aplica horários de início/fim configurados
- Pode excluir datas específicas (funcionalidade preparada)

### 3. Enriquecimento de Dados de Grupos

A função `enrichGroupsWithMembers`:
- Busca membros de grupos nos `groupMembers`
- Adiciona informações detalhadas:
  - ID, nome e foto da pessoa
  - Lista de responsabilidades com imagens
- Usa `person` do `GroupMemberResponseDto` como fallback se pessoa não estiver no array principal
- Retorna estrutura enriquecida para exibição no preview

---

## Melhorias de UI/UX Implementadas

### 1. Exibição de Papéis da Equipe (Step 2)

**Antes**: Lista simples de papéis ocupando muito espaço

**Depois**: 
- Layout em grid compacto (máximo 2 colunas)
- Cards elegantes com:
  - Imagem da função/responsabilidade (com placeholder se não houver)
  - Badge de prioridade sobreposta na imagem
  - Nome do papel
  - Quantidade de pessoas necessárias
  - Badge "Fixa" para papéis com pessoas fixas
- Design responsivo que se adapta ao tamanho da tela

### 2. Exibição de Grupos no Preview (Step 5)

**Antes**: Apenas nome do grupo em texto

**Depois**:
- Cards elegantes para cada grupo
- Cabeçalho com nome do grupo e contagem de membros
- Lista de membros com:
  - Foto da pessoa (com placeholder se não houver)
  - Nome da pessoa
  - Badges de responsabilidades com imagens
- Mensagem apropriada quando não há membros
- Design moderno e visualmente atraente

### 3. Stepper Responsivo

**Implementação**:
- Em telas pequenas (max-width: 768px):
  - Apenas o step atual (`.active`) é exibido
  - Steps anteriores (`.completed`) são ocultados
  - Steps futuros são ocultados
  - Layout vertical com ícone e label lado a lado
  - Linhas conectoras são ocultadas
- Em telas maiores:
  - Todos os steps são exibidos horizontalmente
  - Indicadores visuais de progresso (completed, active, pending)

### 4. Botão Flutuante "Ir para Confirmar"

**Funcionalidades**:
- Aparece fixo no canto inferior direito
- Segue o scroll da página
- Desaparece automaticamente quando o botão "Confirmar Geração" está visível
- Implementado com `IntersectionObserver` para detecção eficiente
- Design circular em telas pequenas, retangular em telas maiores
- Animação de entrada suave
- Backdrop blur para melhor visibilidade

### 5. Remoção de Scroll Interno

**Antes**: Lista de escalas tinha scroll interno limitado

**Depois**:
- Lista de escalas exibe tudo sem scroll interno
- Usuário pode rolar a página normalmente
- Botão flutuante facilita navegação para confirmação

### 6. Estados de Loading

- Indicadores de loading durante:
  - Carregamento inicial de dados
  - Geração de preview
  - Confirmação de geração
- Mensagens apropriadas quando não há dados disponíveis

### 7. Validação Visual

- Indicadores de avisos (warnings) em amarelo
- Indicadores de erros em vermelho
- Badges de status de balanceamento
- Contadores de problemas no resumo

---

## Regras de Negócio Implementadas

### 1. Regra de Pessoa Fixa (Prioridade Máxima)

**Implementação**:
- Pessoas fixas são sempre atribuídas primeiro, antes de qualquer outro algoritmo
- Pessoas fixas **sempre** aparecem na escala, mesmo que:
  - Não estejam no grupo selecionado
  - Não estejam na lista de pessoas selecionadas individualmente
- Esta regra **sobrescreve** a regra de seleção por grupo
- Pessoas fixas são excluídas do pool de pessoas disponíveis para slots restantes

**Exemplo**:
- Equipe precisa de 2 vocalistas femininas
- Pessoa A é fixa para vocalista feminina
- Grupo selecionado tem 3 vocalistas femininas (B, C, D)
- Resultado: Pessoa A sempre atribuída, segunda vaga alterna entre B, C e D

### 2. Regra de Responsabilidade por Grupo

**Implementação**:
- Quando `participantSelection === 'by_group'`:
  - Apenas responsabilidades cadastradas no grupo são consideradas
  - Responsabilidades gerais da área são ignoradas para validação
  - Se pessoa não tem responsabilidade no grupo, não pode ser atribuída

**Exemplo**:
- Pessoa tem "Vocalista Masculino" na área
- No grupo, pessoa tem apenas "Vocalista Feminino"
- Se seleção for por grupo e papel for "Vocalista Masculino": pessoa **não** pode ser atribuída
- Se seleção for por grupo e papel for "Vocalista Feminino": pessoa **pode** ser atribuída

### 3. Regra de Alternância Balanceada

**Implementação**:
- Histórico de atribuições rastreia quantas vezes cada pessoa foi escalada para cada papel
- Pessoas com menos atribuições têm prioridade
- Em caso de empate, usa rotação baseada no índice da escala
- Garante que todas as pessoas elegíveis tenham oportunidades iguais

**Exemplo**:
- 3 pessoas elegíveis (A, B, C) para 2 vagas de vocalista
- Escala 1: A e B (histórico: A=1, B=1, C=0)
- Escala 2: C e A (histórico: A=2, B=1, C=1)
- Escala 3: B e C (histórico: A=2, B=2, C=2)
- Resultado: Distribuição equilibrada

### 4. Regra de Atribuição Vazia

**Implementação**:
- Se não houver pessoa elegível para um papel:
  - Cria atribuição vazia (`[Não atribuído]`)
  - Marca como erro no preview
  - Não tenta atribuir pessoa incorreta como fallback

**Validação**:
- Preview mostra erros claramente
- Resumo indica quantidade de erros
- Usuário pode revisar antes de confirmar

### 5. Regra de Ausências

**Implementação**:
- Se `considerAbsences === true`:
  - Filtra pessoas com ausências que sobrepõem o período da escala
  - Verifica sobreposição de datas (ausência.start <= escala.end && ausência.end >= escala.start)
  - Pessoas ausentes são excluídas do pool de disponíveis

**Exemplo**:
- Escala: 2025-01-15 a 2025-01-22
- Pessoa A tem ausência: 2025-01-10 a 2025-01-20
- Resultado: Pessoa A **não** pode ser atribuída (ausência sobrepõe)

---

## Estrutura de Dados

### GenerationConfiguration

```typescript
interface GenerationConfiguration {
  scheduledAreaId: string
  generationType: 'group' | 'team_without_restriction' | 'team_with_restriction'
  periodType: 'fixed' | 'monthly' | 'weekly' | 'daily'
  periodStartDate: string
  periodEndDate: string
  
  groupConfig?: {
    groupIds: string[]
    groupsPerSchedule: number
    distributionOrder: 'sequential' | 'random' | 'balanced'
    considerAbsences: boolean
  }
  
  teamConfig?: {
    teamId: string
    participantSelection: 'all' | 'by_group' | 'individual'
    selectedGroupIds?: string[]
    selectedPersonIds?: string[]
    considerAbsences: boolean
    requireResponsibilities: boolean
  }
  
  periodConfig?: {
    baseDateTime: string
    duration: number
    interval?: number
    weekdays?: number[]
    startTime?: string
    endTime?: string
    excludedDates?: string[]
    includedDates?: string[]
  }
}
```

### SchedulePreview

```typescript
interface SchedulePreview {
  id: string
  startDatetime: string
  endDatetime: string
  groups?: Array<{ 
    id: string
    name: string
    members?: Array<{
      personId: string
      personName: string
      personPhotoUrl: string | null
      responsibilities: Array<{
        id: string
        name: string
        imageUrl: string | null
      }>
    }>
  }>
  team?: { id: string; name: string }
  assignments?: Array<{
    personId: string
    personName: string
    roleId: string
    roleName: string
  }>
  warnings?: string[]
  errors?: string[]
}
```

### GenerationPreview

```typescript
interface GenerationPreview {
  configuration: GenerationConfiguration
  schedules: SchedulePreview[]
  summary: {
    totalSchedules: number
    totalParticipants: number
    warnings: number
    errors: number
    distributionBalance: 'balanced' | 'unbalanced' | 'critical'
  }
}
```

---

## Fluxo de Uso Implementado

### 1. Acessar Geração Automática
- Usuário acessa a área de escalas
- Seleciona aba "Geração Automática"
- Sistema carrega automaticamente:
  - Grupos da área
  - Equipes da área
  - Pessoas da área
  - Ausências agendadas
  - Responsabilidades da área

### 2. Configurar Geração (Wizard)
- **Step 1**: Seleciona tipo de geração
- **Step 2**: Configura parâmetros específicos (grupos ou equipe)
- **Step 3**: Seleciona participantes (se aplicável)
- **Step 4**: Define período e datas
- **Step 5**: Visualiza preview e confirma

### 3. Visualizar Preview
- Sistema gera preview usando dados reais
- Exibe todas as escalas que serão criadas
- Mostra grupos com membros e papéis
- Mostra atribuições de equipe
- Indica avisos e erros
- Resumo estatístico

### 4. Confirmar e Gerar
- Usuário revisa preview
- Clica em "Confirmar Geração"
- Modal de confirmação aparece
- Sistema chama `confirmGenerationMock` (mock - aguardando API real)
- Feedback de sucesso/erro é exibido

---

## Requisitos Técnicos Implementados

### Front-end

✅ **Interface Wizard/Stepper**:
- 5 etapas sequenciais
- Navegação entre etapas
- Validação de etapas
- Indicadores visuais de progresso
- Responsivo (apenas step atual em telas pequenas)

✅ **Preview Interativo**:
- Geração em tempo real
- Exibição detalhada de grupos e atribuições
- Indicadores visuais de problemas
- Resumo estatístico

✅ **Validação em Tempo Real**:
- Validação de responsabilidades
- Detecção de ausências
- Verificação de atribuições vazias
- Indicadores de balanceamento

✅ **Feedback Visual**:
- Estados de loading
- Mensagens de erro/aviso
- Badges de status
- Animações suaves

✅ **Tratamento de Erros**:
- Try/catch em todas as operações assíncronas
- Mensagens de erro amigáveis
- Fallbacks para dados ausentes

✅ **Responsividade**:
- Layout adaptável a diferentes tamanhos de tela
- Stepper simplificado em telas pequenas
- Botão flutuante responsivo
- Grid de papéis adaptável

### Integração com APIs

✅ **Carregamento de Dados**:
- Funções `loadAll*` para carregar todos os registros
- Tratamento de paginação
- Cache com `withCache`
- Estados de loading

✅ **Validação de Dados**:
- Verificação de dados necessários antes de gerar preview
- Tratamento de arrays vazios
- Fallbacks para dados ausentes

### Algoritmos

✅ **Geração de Escalas**:
- Suporte a 4 tipos de período
- Cálculo correto de datas
- Distribuição balanceada

✅ **Atribuição de Papéis**:
- Priorização de pessoas fixas
- Validação de responsabilidades
- Algoritmo de balanceamento
- Tratamento de ausências
- Atribuições vazias quando necessário

---

## Melhorias de Performance

### 1. Cache de Requisições
- Uso de `withCache` para evitar requisições duplicadas
- Cache de imagens com `addCacheBusting` para evitar problemas de cache do navegador

### 2. IntersectionObserver
- Uso de `IntersectionObserver` para detectar visibilidade do botão de confirmação
- Mais eficiente que verificação manual no scroll

### 3. Carregamento Lazy
- Dados de `groupMembers` são carregados apenas quando necessário
- Não carrega dados desnecessários

### 4. Otimização de Renderização
- Componentes funcionais com hooks otimizados
- `useCallback` para funções que são passadas como props
- Estados locais apenas quando necessário

---

## Validações Implementadas

### Validações de Dados
- ✅ Verificação de dados necessários antes de gerar preview
- ✅ Validação de equipe selecionada (Step 2)
- ✅ Validação de grupos selecionados (Step 2)
- ✅ Validação de período (datas de início/fim)
- ✅ Validação de configurações de período (duração, intervalo, etc.)

### Validações de Negócio
- ✅ Verificação de responsabilidades (modo restrito)
- ✅ Verificação de ausências (se habilitado)
- ✅ Detecção de atribuições vazias
- ✅ Validação de pessoas elegíveis para papéis

### Validações de Preview
- ✅ Detecção de pessoas ausentes nas atribuições
- ✅ Detecção de pessoas sem responsabilidade necessária
- ✅ Detecção de atribuições vazias
- ✅ Cálculo de balanceamento da distribuição

---

## Problemas Resolvidos

### 1. Atribuição Incorreta de Papéis
**Problema**: Sistema atribuía papéis a pessoas que não tinham a responsabilidade correta (ex: vocalista feminino para pessoa com apenas vocalista masculino no grupo).

**Solução**: Implementada validação rigorosa de responsabilidades baseada em `participantSelection`. Quando `by_group`, usa apenas responsabilidades do grupo.

### 2. Falta de Alternância
**Problema**: Mesmo com múltiplas pessoas elegíveis, uma pessoa era consistentemente deixada de fora.

**Solução**: Implementado algoritmo de balanceamento com histórico de atribuições e rotação baseada em índice de escala.

### 3. Pessoas Fixas Não Priorizadas
**Problema**: Pessoas fixas não eram sempre atribuídas, mesmo quando configuradas.

**Solução**: Implementada priorização de pessoas fixas que executa antes de qualquer outro algoritmo. Pessoas fixas são sempre atribuídas primeiro.

### 4. Pessoas Fixas Excluídas por Grupo
**Problema**: Pessoas fixas eram excluídas se não estivessem no grupo selecionado.

**Solução**: Regra de pessoa fixa sobrescreve regra de grupo. Pessoas fixas são sempre incluídas, mesmo que não estejam no grupo.

### 5. Exibição de Grupos no Preview
**Problema**: Preview mostrava apenas nome do grupo, sem informações de membros.

**Solução**: Implementada função `enrichGroupsWithMembers` que busca e exibe membros com fotos e responsabilidades.

### 6. Mensagem Incorreta de "Nenhum Membro"
**Problema**: Mensagem aparecia mesmo quando havia membros cadastrados.

**Solução**: Corrigida lógica de carregamento de `groupMembers` para incluir quando `generationType === 'group'` e ajustado fallback para usar `member.person` quando pessoa não está no array principal.

### 7. Stepper Ocupando Muito Espaço em Telas Pequenas
**Problema**: Todos os steps apareciam um embaixo do outro em telas pequenas.

**Solução**: Implementado CSS responsivo que oculta steps não ativos em telas pequenas, mostrando apenas o step atual.

### 8. Dificuldade de Navegação no Preview
**Problema**: Lista de escalas tinha scroll interno e era difícil chegar ao botão de confirmação.

**Solução**: Removido scroll interno e adicionado botão flutuante "Ir para Confirmar" que aparece/desaparece automaticamente baseado na visibilidade do botão de confirmação.

---

## Melhorias Futuras Sugeridas

### Funcionalidades
- [ ] Implementação da API real de confirmação de geração
- [ ] Exportação de escalas em PDF/Excel
- [ ] Histórico de gerações automáticas
- [ ] Reutilização de configurações anteriores
- [ ] Edição de escalas geradas automaticamente
- [ ] Notificações automáticas para participantes

### UI/UX
- [ ] Animações mais elaboradas
- [ ] Modo escuro
- [ ] Acessibilidade melhorada (ARIA labels, navegação por teclado)
- [ ] Tooltips informativos
- [ ] Preview em formato de calendário

### Performance
- [ ] Virtualização da lista de escalas para grandes volumes
- [ ] Lazy loading de imagens
- [ ] Debounce em campos de formulário
- [ ] Otimização de re-renderizações

### Algoritmos
- [ ] Machine Learning para otimização de distribuições
- [ ] Sugestões automáticas de melhor distribuição
- [ ] Análise de padrões históricos
- [ ] Otimização multi-objetivo (balanceamento, preferências, etc.)

---

## Conclusão

A versão 3 do sistema de Geração Automática de Escalas implementa todas as funcionalidades principais especificadas na proposta inicial, com melhorias significativas de UI/UX, algoritmos robustos de balanceamento e atribuição, e integração completa com as APIs existentes. O sistema está pronto para uso, aguardando apenas a implementação da API real de confirmação de geração.

---

## Changelog Detalhado

### v3.0 - Implementação Completa

#### Funcionalidades
- ✅ Wizard de 5 etapas completo
- ✅ Integração com todas as APIs existentes
- ✅ Geração de preview com dados reais
- ✅ Algoritmo de atribuição com priorização de pessoas fixas
- ✅ Algoritmo de balanceamento e alternância
- ✅ Validação de responsabilidades por grupo
- ✅ Tratamento de ausências
- ✅ Suporte a 4 tipos de período

#### UI/UX
- ✅ Layout compacto e elegante de papéis da equipe
- ✅ Exibição detalhada de grupos no preview
- ✅ Stepper responsivo (apenas step atual em telas pequenas)
- ✅ Botão flutuante "Ir para Confirmar"
- ✅ Remoção de scroll interno na lista de escalas
- ✅ Estados de loading e mensagens apropriadas

#### Correções
- ✅ Atribuição incorreta de papéis corrigida
- ✅ Alternância de pessoas implementada
- ✅ Priorização de pessoas fixas implementada
- ✅ Regra de pessoa fixa sobrescreve regra de grupo
- ✅ Exibição de membros de grupos corrigida
- ✅ Mensagem de "Nenhum membro" corrigida
- ✅ Stepper responsivo implementado
- ✅ Navegação no preview melhorada

---

**Documentação criada em**: 2025-01-XX  
**Versão do sistema**: 3.0  
**Status**: Implementação completa, aguardando API de confirmação

