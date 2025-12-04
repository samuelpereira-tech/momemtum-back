# Test Mocks

Este diretório contém mocks reutilizáveis para os testes do projeto.

## Estrutura

- `supabase.mock.ts` - Mocks do Supabase (client, queries, service)
- `common.mock.ts` - Mocks comuns (ConfigService, AuthGuard, arquivos)
- `person.mock.ts` - Mocks relacionados a Person
- `person-area.mock.ts` - Mocks relacionados a PersonArea
- `responsibility.mock.ts` - Mocks relacionados a Responsibility
- `scheduled-area.mock.ts` - Mocks relacionados a ScheduledArea
- `scheduled-absence.mock.ts` - Mocks relacionados a ScheduledAbsence
- `absence-type.mock.ts` - Mocks relacionados a AbsenceType
- `index.ts` - Exportações centralizadas

## Uso

```typescript
import {
  createMockSupabaseClient,
  createMockPersonData,
  createMockPersonResponse,
  createMockPersonService,
} from '../../mocks';

// Nos testes
const mockPersonData = createMockPersonData({ id: 'custom-id' });
const mockPersonResponse = createMockPersonResponse({ id: 'custom-id' });
const mockService = createMockPersonService();
```

## Benefícios

1. **Reutilização**: Mocks compartilhados entre testes
2. **Consistência**: Dados de teste padronizados
3. **Manutenibilidade**: Mudanças em um único lugar
4. **Redução de redundância**: Menos código duplicado

