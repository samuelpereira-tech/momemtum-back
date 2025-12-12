import {
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

export interface RelatedRecord {
  id: string;
  name?: string;
  relativeUrl: string;
}

export interface ForeignKeyErrorDetails {
  message: string;
  relatedRecords: RelatedRecord[];
}

/**
 * Verifica se o erro é de rate limiting do Supabase
 */
export function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message || '';
  return (
    errorMessage.includes('For security purposes') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  );
}

/**
 * Extrai informações de erro de foreign key constraint
 */
function parseForeignKeyError(errorMessage: string): {
  table: string;
  constraint: string;
  action: 'insert' | 'update' | 'delete';
} | null {
  // Padrão: "update or delete on table "X" violates foreign key constraint "Y_fkey" on table "Z"
  const match = errorMessage.match(
    /(insert|update|delete) on table "([^"]+)" violates foreign key constraint "([^"]+)" on table "([^"]+)"/i,
  );
  if (match) {
    return {
      table: match[2],
      constraint: match[3],
      action: match[1].toLowerCase() as 'insert' | 'update' | 'delete',
    };
  }
  
  // Padrão alternativo: "Key (column)=(value) is not present in table "table""
  // Isso geralmente ocorre em INSERT quando a referência não existe
  const insertMatch = errorMessage.match(
    /Key \(([^)]+)\)=\([^)]+\) is not present in table "([^"]+)"/i,
  );
  if (insertMatch) {
    // Para este caso, não temos todas as informações, mas sabemos que é um INSERT
    return {
      table: insertMatch[2],
      constraint: insertMatch[1],
      action: 'insert',
    };
  }
  
  return null;
}

/**
 * Gera mensagem amigável para erro de foreign key
 */
function getForeignKeyErrorMessage(fkInfo: {
  table: string;
  constraint: string;
  action: 'update' | 'delete';
}): string {
  const { table, constraint, action } = fkInfo;

  // Mapeamento de constraints conhecidas para mensagens amigáveis
  const constraintMessages: Record<string, string> = {
    scheduled_areas_responsible_person_id_fkey:
      'Esta pessoa não pode ser removida porque está sendo usada como pessoa responsável em uma ou mais áreas agendadas. Por favor, altere a pessoa responsável dessas áreas antes de remover esta pessoa.',
    responsibilities_scheduled_area_id_fkey:
      'Esta área agendada não pode ser removida porque possui responsabilidades associadas. Por favor, remova ou transfira as responsabilidades antes de remover esta área.',
    person_areas_person_id_fkey:
      'Esta pessoa não pode ser removida porque está associada a uma ou mais áreas agendadas.',
    person_areas_scheduled_area_id_fkey:
      'Esta área agendada não pode ser removida porque possui pessoas associadas.',
    area_groups_scheduled_area_id_fkey:
      'Esta área agendada não pode ser removida porque possui grupos associados.',
    area_teams_scheduled_area_id_fkey:
      'Esta área agendada não pode ser removida porque possui equipes associadas.',
    area_group_members_person_id_fkey:
      'Esta pessoa não pode ser removida porque é membro de um ou mais grupos.',
    area_team_role_fixed_persons_person_id_fkey:
      'Esta pessoa não pode ser removida porque está atribuída a uma ou mais funções em equipes.',
    scheduled_absences_absence_type_id_fkey:
      'Este tipo de ausência não pode ser removido porque está sendo usado em uma ou mais ausências agendadas. Por favor, remova ou altere as ausências antes de remover este tipo.',
    area_team_roles_responsibility_id_fkey:
      'Esta responsabilidade não pode ser removida porque está sendo usada em uma ou mais funções de equipes. Por favor, remova ou altere as funções antes de remover esta responsabilidade.',
  };

  // Se temos uma mensagem específica, use-a
  if (constraintMessages[constraint]) {
    return constraintMessages[constraint];
  }

  // Mensagem genérica baseada na tabela
  const tableNames: Record<string, string> = {
    persons: 'pessoa',
    scheduled_areas: 'área agendada',
    responsibilities: 'responsabilidade',
    person_areas: 'associação pessoa-área',
    area_groups: 'grupo',
    area_teams: 'equipe',
  };

  const tableName = tableNames[table] || table;
  const actionText = action === 'delete' ? 'removida' : 'atualizada';

  return `Esta ${tableName} não pode ser ${actionText} porque está sendo referenciada em outras partes do sistema. Por favor, remova as referências antes de ${action === 'delete' ? 'remover' : 'atualizar'}.`;
}

/**
 * Gera URL relativa para um registro baseado na tabela e ID
 */
function generateRelativeUrl(
  table: string,
  id: string,
  parentTable?: string,
  parentId?: string,
): string {
  const urlMap: Record<string, (id: string, parent?: { table: string; id: string }) => string> = {
    persons: (id) => `/persons/${id}`,
    scheduled_areas: (id) => `/api/scheduled-areas/${id}`,
    responsibilities: (id) => `/api/responsibilities/${id}`,
    absence_types: (id) => `/api/absence-types/${id}`,
    person_areas: (id, parent) =>
      parent ? `/api/scheduled-areas/${parent.id}/persons/${id}` : `/api/person-areas/${id}`,
    area_groups: (id, parent) =>
      parent ? `/api/scheduled-areas/${parent.id}/groups/${id}` : `/api/groups/${id}`,
    area_teams: (id, parent) =>
      parent ? `/api/scheduled-areas/${parent.id}/teams/${id}` : `/api/teams/${id}`,
    scheduled_absences: (id) => `/api/scheduled-absences/${id}`,
  };

  const generator = urlMap[table];
  if (generator) {
    return generator(
      id,
      parentTable && parentId ? { table: parentTable, id: parentId } : undefined,
    );
  }

  // URL genérica
  return `/api/${table}/${id}`;
}

/**
 * Busca registros relacionados quando há erro de foreign key
 */
async function findRelatedRecords(
  supabaseClient: any,
  fkInfo: {
    table: string;
    constraint: string;
    action: 'insert' | 'update' | 'delete';
  },
  recordId: string,
): Promise<RelatedRecord[]> {
  const { table, constraint } = fkInfo;
  const relatedRecords: RelatedRecord[] = [];

  try {
    // Mapeamento de constraints para queries de busca
    const constraintQueries: Record<
      string,
      (client: any, id: string) => Promise<{ data: any[] | null; error: any }>
    > = {
      scheduled_areas_responsible_person_id_fkey: async (client, personId) => {
        const result = await client
          .from('scheduled_areas')
          .select('id, name')
          .eq('responsible_person_id', personId);
        return result;
      },
      responsibilities_scheduled_area_id_fkey: async (client, areaId) => {
        const result = await client
          .from('responsibilities')
          .select('id, name')
          .eq('scheduled_area_id', areaId);
        return result;
      },
      person_areas_person_id_fkey: async (client, personId) => {
        const result = await client
          .from('person_areas')
          .select('id, scheduled_area_id')
          .eq('person_id', personId);
        return result;
      },
      person_areas_scheduled_area_id_fkey: async (client, areaId) => {
        const result = await client
          .from('person_areas')
          .select('id, person_id')
          .eq('scheduled_area_id', areaId);
        return result;
      },
      area_groups_scheduled_area_id_fkey: async (client, areaId) => {
        const result = await client
          .from('area_groups')
          .select('id, name, scheduled_area_id')
          .eq('scheduled_area_id', areaId);
        return result;
      },
      area_teams_scheduled_area_id_fkey: async (client, areaId) => {
        const result = await client
          .from('area_teams')
          .select('id, name, scheduled_area_id')
          .eq('scheduled_area_id', areaId);
        return result;
      },
      area_group_members_person_id_fkey: async (client, personId) => {
        const result = await client
          .from('area_group_members')
          .select('id, group_id, group:area_groups!inner(id, name, scheduled_area_id)')
          .eq('person_id', personId);
        return result;
      },
      area_team_role_fixed_persons_person_id_fkey: async (client, personId) => {
        const result = await client
          .from('area_team_role_fixed_persons')
          .select(
            'id, team_role_id, team_role:area_team_roles!inner(id, team_id, team:area_teams!inner(id, name, scheduled_area_id))',
          )
          .eq('person_id', personId);
        return result;
      },
      scheduled_absences_absence_type_id_fkey: async (client, typeId) => {
        const result = await client
          .from('scheduled_absences')
          .select('id, start_date, end_date, person_id')
          .eq('absence_type_id', typeId);
        return result;
      },
      area_team_roles_responsibility_id_fkey: async (client, responsibilityId) => {
        const result = await client
          .from('area_team_roles')
          .select('id, team_id, team:area_teams!inner(id, name, scheduled_area_id)')
          .eq('responsibility_id', responsibilityId);
        return result;
      },
    };

    const queryFn = constraintQueries[constraint];
    if (!queryFn) {
      return relatedRecords;
    }

    const { data, error } = await queryFn(supabaseClient, recordId);
    if (error || !data) {
      return relatedRecords;
    }

    // Processa os resultados e gera URLs
    for (const record of data) {
      let relativeUrl = '';
      let recordName = '';

      switch (constraint) {
        case 'scheduled_areas_responsible_person_id_fkey':
          relativeUrl = generateRelativeUrl('scheduled_areas', record.id);
          recordName = record.name;
          break;
        case 'responsibilities_scheduled_area_id_fkey':
          relativeUrl = generateRelativeUrl('responsibilities', record.id);
          recordName = record.name;
          break;
        case 'person_areas_person_id_fkey':
          relativeUrl = generateRelativeUrl(
            'person_areas',
            record.id,
            'scheduled_areas',
            record.scheduled_area_id,
          );
          break;
        case 'person_areas_scheduled_area_id_fkey':
          relativeUrl = generateRelativeUrl('persons', record.person_id);
          break;
        case 'area_groups_scheduled_area_id_fkey':
          relativeUrl = generateRelativeUrl(
            'area_groups',
            record.id,
            'scheduled_areas',
            record.scheduled_area_id,
          );
          recordName = record.name;
          break;
        case 'area_teams_scheduled_area_id_fkey':
          relativeUrl = generateRelativeUrl(
            'area_teams',
            record.id,
            'scheduled_areas',
            record.scheduled_area_id,
          );
          recordName = record.name;
          break;
        case 'area_group_members_person_id_fkey':
          if (record.group && Array.isArray(record.group) && record.group.length > 0) {
            const group = record.group[0];
            relativeUrl = generateRelativeUrl(
              'area_groups',
              record.group_id,
              'scheduled_areas',
              group.scheduled_area_id,
            );
            recordName = group.name;
          } else if (record.group && !Array.isArray(record.group)) {
            relativeUrl = generateRelativeUrl(
              'area_groups',
              record.group_id,
              'scheduled_areas',
              record.group.scheduled_area_id,
            );
            recordName = record.group.name;
          }
          break;
        case 'area_team_role_fixed_persons_person_id_fkey':
          const teamRole = Array.isArray(record.team_role) ? record.team_role[0] : record.team_role;
          if (teamRole?.team) {
            const team = Array.isArray(teamRole.team) ? teamRole.team[0] : teamRole.team;
            if (team && team.id) {
              relativeUrl = generateRelativeUrl(
                'area_teams',
                team.id,
                'scheduled_areas',
                team.scheduled_area_id,
              );
              recordName = team.name;
            }
          }
          break;
        case 'scheduled_absences_absence_type_id_fkey':
          relativeUrl = generateRelativeUrl('scheduled_absences', record.id);
          recordName = `${record.start_date} - ${record.end_date}`;
          break;
        case 'area_team_roles_responsibility_id_fkey':
          const team = Array.isArray(record.team) ? record.team[0] : record.team;
          if (team) {
            relativeUrl = generateRelativeUrl(
              'area_teams',
              record.team_id,
              'scheduled_areas',
              team.scheduled_area_id,
            );
            recordName = team.name;
          }
          break;
      }

      if (relativeUrl) {
        relatedRecords.push({
          id: record.id,
          name: recordName || undefined,
          relativeUrl,
        });
      }
    }
  } catch (error) {
    // Se houver erro ao buscar registros relacionados, retorna lista vazia
    // A mensagem de erro principal ainda será retornada
  }

  return relatedRecords;
}

/**
 * Converte erros do Supabase em exceções HTTP apropriadas
 * Versão assíncrona que busca registros relacionados para erros de foreign key
 */
export async function handleSupabaseErrorWithDetails(
  error: any,
  supabaseClient: any,
  recordId: string,
  table: string,
): Promise<never> {
  if (!error) {
    throw new BadRequestException('An error occurred');
  }

  const errorMessage = error.message || 'An error occurred';

  // Rate limiting - 403 Forbidden
  if (isRateLimitError(error)) {
    throw new ForbiddenException(errorMessage);
  }

  // Erros de autenticação - 401 Unauthorized
  if (
    errorMessage.includes('Invalid credentials') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Invalid password') ||
    errorMessage.includes('User not found')
  ) {
    throw new UnauthorizedException(errorMessage);
  }

  // Erros de foreign key constraint
  if (errorMessage.includes('violates foreign key constraint') || 
      errorMessage.includes('is not present in table')) {
    const fkInfo = parseForeignKeyError(errorMessage);
    if (fkInfo) {
      // INSERT violations: referência não existe (400 Bad Request)
      if (fkInfo.action === 'insert') {
        throw new BadRequestException(
          `A referência fornecida não existe. Verifique se o registro referenciado existe no sistema.`,
        );
      }
      
      // DELETE/UPDATE violations: registro está sendo usado (409 Conflict)
      // TypeScript narrowing: após verificar 'insert', só pode ser 'update' ou 'delete'
      const friendlyMessage = getForeignKeyErrorMessage(fkInfo as { table: string; constraint: string; action: 'update' | 'delete' });
      const relatedRecords = await findRelatedRecords(supabaseClient, fkInfo as { table: string; constraint: string; action: 'update' | 'delete' }, recordId);

      // Cria uma exceção com os detalhes
      // O NestJS serializa o objeto passado como segundo parâmetro
      throw new ConflictException({
        message: friendlyMessage,
        relatedRecords,
      } as ForeignKeyErrorDetails);
    }
    
    // Se não conseguiu parsear mas é um erro de foreign key, verifica se parece ser INSERT
    if (errorMessage.toLowerCase().includes('insert') || 
        errorMessage.includes('is not present in table')) {
      throw new BadRequestException(
        `A referência fornecida não existe. Verifique se o registro referenciado existe no sistema.`,
      );
    }
    
    throw new ConflictException(
      'Esta operação não pode ser realizada porque o registro está sendo usado em outras partes do sistema.',
    );
  }

  // Erros de validação - 400 Bad Request
  if (
    errorMessage.includes('Email already registered') ||
    errorMessage.includes('User already registered') ||
    errorMessage.includes('Invalid email') ||
    errorMessage.includes('Invalid phone')
  ) {
    throw new BadRequestException(errorMessage);
  }

  // Outros erros - 400 Bad Request
  throw new BadRequestException(errorMessage);
}

/**
 * Converte erros do Supabase em exceções HTTP apropriadas
 * Versão síncrona (mantida para compatibilidade)
 */
export function handleSupabaseError(error: any): never {
  if (!error) {
    throw new BadRequestException('An error occurred');
  }

  const errorMessage = error.message || 'An error occurred';

  // Rate limiting - 403 Forbidden
  if (isRateLimitError(error)) {
    throw new ForbiddenException(errorMessage);
  }

  // Erros de autenticação - 401 Unauthorized
  if (
    errorMessage.includes('Invalid credentials') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Invalid password') ||
    errorMessage.includes('User not found')
  ) {
    throw new UnauthorizedException(errorMessage);
  }

  // Erros de foreign key constraint
  if (errorMessage.includes('violates foreign key constraint') || 
      errorMessage.includes('is not present in table')) {
    const fkInfo = parseForeignKeyError(errorMessage);
    if (fkInfo) {
      // INSERT violations: referência não existe (400 Bad Request)
      if (fkInfo.action === 'insert') {
        throw new BadRequestException(
          `A referência fornecida não existe. Verifique se o registro referenciado existe no sistema.`,
        );
      }
      
      // DELETE/UPDATE violations: registro está sendo usado (409 Conflict)
      // TypeScript narrowing: após verificar 'insert', só pode ser 'update' ou 'delete'
      const friendlyMessage = getForeignKeyErrorMessage(fkInfo as { table: string; constraint: string; action: 'update' | 'delete' });
      throw new ConflictException(friendlyMessage);
    }
    
    // Se não conseguiu parsear mas é um erro de foreign key, verifica se parece ser INSERT
    if (errorMessage.toLowerCase().includes('insert') || 
        errorMessage.includes('is not present in table')) {
      throw new BadRequestException(
        `A referência fornecida não existe. Verifique se o registro referenciado existe no sistema.`,
      );
    }
    
    throw new ConflictException(
      'Esta operação não pode ser realizada porque o registro está sendo usado em outras partes do sistema.',
    );
  }

  // Erros de validação - 400 Bad Request
  if (
    errorMessage.includes('Email already registered') ||
    errorMessage.includes('User already registered') ||
    errorMessage.includes('Invalid email') ||
    errorMessage.includes('Invalid phone')
  ) {
    throw new BadRequestException(errorMessage);
  }

  // Outros erros - 400 Bad Request
  throw new BadRequestException(errorMessage);
}

