import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import {
  TeamResponseDto,
  PaginatedTeamResponseDto,
  TeamRoleDto,
} from '../dto/team-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import { CreateTeamRoleDto } from '../dto/create-team-role.dto';
import { UpdateTeamRoleDto } from '../dto/update-team-role.dto';

@Injectable()
export class TeamAreaService {
  private readonly tableName = 'area_teams';
  private readonly rolesTableName = 'area_team_roles';
  private readonly fixedPersonsTableName = 'area_team_role_fixed_persons';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    // Verifica se já existe um team com o mesmo nome na área
    const { data: existingTeam } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('scheduled_area_id', scheduledAreaId)
      .eq('name', createTeamDto.name)
      .single();

    if (existingTeam) {
      throw new ConflictException(
        'Team with this name already exists in the scheduled area',
      );
    }

    // Valida roles se fornecidos
    if (createTeamDto.roles && createTeamDto.roles.length > 0) {
      await this.validateRoles(scheduledAreaId, createTeamDto.roles, null);
    }

    // Insere o team
    const insertData: any = {
      name: createTeamDto.name,
      scheduled_area_id: scheduledAreaId,
    };

    if (createTeamDto.description) {
      insertData.description = createTeamDto.description;
    }

    const { data: teamData, error: teamError } = await supabaseClient
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (teamError) {
      handleSupabaseError(teamError);
    }

    // Insere os roles se fornecidos
    if (createTeamDto.roles && createTeamDto.roles.length > 0) {
      await this.insertRoles(supabaseClient, teamData.id, createTeamDto.roles);
    }

    return this.findOne(scheduledAreaId, teamData.id);
  }

  async findAll(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
    name?: string,
  ): Promise<PaginatedTeamResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        scheduled_area:scheduled_areas(id, name),
        roles:${this.rolesTableName}(
          id,
          responsibility_id,
          quantity,
          priority,
          is_free,
          responsibility:responsibilities(id, name)
        )
      `,
        { count: 'exact' },
      )
      .eq('scheduled_area_id', scheduledAreaId);

    // Aplica filtro por nome se fornecido
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    // Processa os dados para o formato correto
    const processedData = await Promise.all(
      (data || []).map((item: any) => this.mapToResponseDto(item)),
    );

    return {
      data: processedData,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    scheduledAreaId: string,
    teamId: string,
  ): Promise<TeamResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        scheduled_area:scheduled_areas(id, name),
        roles:${this.rolesTableName}(
          id,
          responsibility_id,
          quantity,
          priority,
          is_free,
          responsibility:responsibilities(id, name)
        )
      `,
      )
      .eq('id', teamId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Team not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Team not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    scheduledAreaId: string,
    teamId: string,
    updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o team existe
    await this.findOne(scheduledAreaId, teamId);

    // Se está atualizando o nome, verifica se já existe outro team com o mesmo nome
    if (updateTeamDto.name) {
      const { data: existingTeam } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('scheduled_area_id', scheduledAreaId)
        .eq('name', updateTeamDto.name)
        .neq('id', teamId)
        .single();

      if (existingTeam) {
        throw new ConflictException(
          'Team with this name already exists in the scheduled area',
        );
      }
    }

    // Valida roles se fornecidos
    if (updateTeamDto.roles !== undefined) {
      await this.validateRoles(scheduledAreaId, updateTeamDto.roles, teamId);
    }

    // Atualiza o team
    const updateData: any = {};
    if (updateTeamDto.name !== undefined) updateData.name = updateTeamDto.name;
    if (updateTeamDto.description !== undefined)
      updateData.description = updateTeamDto.description;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseClient
        .from(this.tableName)
        .update(updateData)
        .eq('id', teamId)
        .eq('scheduled_area_id', scheduledAreaId);

      if (error) {
        handleSupabaseError(error);
      }
    }

    // Atualiza os roles se fornecidos (substitui todos)
    if (updateTeamDto.roles !== undefined) {
      // Busca os IDs dos roles existentes
      const { data: existingRoles } = await supabaseClient
        .from(this.rolesTableName)
        .select('id')
        .eq('team_id', teamId);

      // Remove todos os fixed persons dos roles existentes
      if (existingRoles && existingRoles.length > 0) {
        const roleIds = existingRoles.map((r) => r.id);
        const { error: deleteFixedPersonsError } = await supabaseClient
          .from(this.fixedPersonsTableName)
          .delete()
          .in('team_role_id', roleIds);

        if (deleteFixedPersonsError) {
          handleSupabaseError(deleteFixedPersonsError);
        }
      }

      // Remove todos os roles existentes
      const { error: deleteRolesError } = await supabaseClient
        .from(this.rolesTableName)
        .delete()
        .eq('team_id', teamId);

      if (deleteRolesError) {
        handleSupabaseError(deleteRolesError);
      }

      // Insere os novos roles
      if (updateTeamDto.roles.length > 0) {
        await this.insertRoles(supabaseClient, teamId, updateTeamDto.roles);
      }
    }

    return this.findOne(scheduledAreaId, teamId);
  }

  async remove(scheduledAreaId: string, teamId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o team existe
    await this.findOne(scheduledAreaId, teamId);

    // Remove os fixed persons primeiro (CASCADE deve fazer isso, mas vamos garantir)
    const { data: roles } = await supabaseClient
      .from(this.rolesTableName)
      .select('id')
      .eq('team_id', teamId);

    if (roles && roles.length > 0) {
      const roleIds = roles.map((r) => r.id);
      await supabaseClient
        .from(this.fixedPersonsTableName)
        .delete()
        .in('team_role_id', roleIds);
    }

    // Remove os roles
    await supabaseClient.from(this.rolesTableName).delete().eq('team_id', teamId);

    // Remove o team
    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', teamId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async validateRoles(
    scheduledAreaId: string,
    roles: (CreateTeamRoleDto | UpdateTeamRoleDto)[],
    teamId: string | null,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica prioridades únicas
    const priorities = roles.map((r) => r.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      throw new BadRequestException(
        'Each role must have a unique priority within the team',
      );
    }

    // Verifica se todas as responsabilidades pertencem à área
    const responsibilityIds = roles.map((r) => r.responsibilityId);
    const { data: responsibilities, error: respError } = await supabaseClient
      .from('responsibilities')
      .select('id, scheduled_area_id')
      .in('id', responsibilityIds);

    if (respError) {
      handleSupabaseError(respError);
    }

    if (!responsibilities || responsibilities.length !== responsibilityIds.length) {
      throw new BadRequestException(
        'One or more responsibilities not found',
      );
    }

    for (const resp of responsibilities) {
      if (resp.scheduled_area_id !== scheduledAreaId) {
        throw new BadRequestException(
          `Responsibility ${resp.id} does not belong to the scheduled area`,
        );
      }
    }

    // Nota: Quando atualizando roles, todos os roles são substituídos,
    // então a validação de prioridades únicas dentro do array fornecido
    // (feita acima) é suficiente. Não precisamos verificar conflitos com roles existentes.

    // Valida cada role
    for (const role of roles) {
      // Valida quantidade mínima
      if (role.quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      // Valida prioridade mínima
      if (role.priority < 1) {
        throw new BadRequestException('Priority must be at least 1');
      }

      // Valida isFree e fixedPersonIds
      const isFree = role.isFree !== undefined ? role.isFree : true;
      if (!isFree) {
        if (!role.fixedPersonIds || role.fixedPersonIds.length === 0) {
          throw new BadRequestException(
            'At least one person must be assigned when isFree is false',
          );
        }

        if (role.fixedPersonIds.length > role.quantity) {
          throw new BadRequestException(
            'The number of fixed persons cannot exceed the quantity',
          );
        }

        // Verifica se todas as pessoas estão associadas à área
        await this.validatePersonsInArea(
          scheduledAreaId,
          role.fixedPersonIds,
        );
      }
    }
  }

  private async validatePersonsInArea(
    scheduledAreaId: string,
    personIds: string[],
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data: personAreas, error } = await supabaseClient
      .from('person_areas')
      .select('person_id')
      .eq('scheduled_area_id', scheduledAreaId)
      .in('person_id', personIds);

    if (error) {
      handleSupabaseError(error);
    }

    if (!personAreas || personAreas.length !== personIds.length) {
      const foundPersonIds = new Set(
        personAreas?.map((pa) => pa.person_id) || [],
      );
      const missingPersonIds = personIds.filter(
        (id) => !foundPersonIds.has(id),
      );
      throw new BadRequestException(
        `The following persons are not associated with the scheduled area: ${missingPersonIds.join(', ')}`,
      );
    }
  }

  private async insertRoles(
    supabaseClient: any,
    teamId: string,
    roles: (CreateTeamRoleDto | UpdateTeamRoleDto)[],
  ): Promise<void> {
    // Insere os roles
    const rolesToInsert = roles.map((role) => ({
      team_id: teamId,
      responsibility_id: role.responsibilityId,
      quantity: role.quantity,
      priority: role.priority,
      is_free: role.isFree !== undefined ? role.isFree : true,
    }));

    const { data: insertedRoles, error: rolesError } = await supabaseClient
      .from(this.rolesTableName)
      .insert(rolesToInsert)
      .select('id, priority');

    if (rolesError) {
      handleSupabaseError(rolesError);
    }

    // Insere os fixed persons para roles que não são livres
    const fixedPersonsToInsert: any[] = [];
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const isFree = role.isFree !== undefined ? role.isFree : true;
      if (!isFree && role.fixedPersonIds && role.fixedPersonIds.length > 0) {
        const roleId = insertedRoles[i].id;
        for (const personId of role.fixedPersonIds) {
          fixedPersonsToInsert.push({
            team_role_id: roleId,
            person_id: personId,
          });
        }
      }
    }

    if (fixedPersonsToInsert.length > 0) {
      const { error: fixedPersonsError } = await supabaseClient
        .from(this.fixedPersonsTableName)
        .insert(fixedPersonsToInsert);

      if (fixedPersonsError) {
        handleSupabaseError(fixedPersonsError);
      }
    }
  }

  private async mapToResponseDto(data: any): Promise<TeamResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const result: TeamResponseDto = {
      id: data.id,
      name: data.name,
      description: data.description || null,
      scheduledAreaId: data.scheduled_area_id,
      scheduledArea: null,
      roles: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Adiciona informações da área agendada se disponível
    if (data.scheduled_area) {
      result.scheduledArea = {
        id: data.scheduled_area.id,
        name: data.scheduled_area.name,
      };
    }

    // Processa roles
    if (data.roles && Array.isArray(data.roles)) {
      // Busca os fixed persons para cada role
      const roleIds = data.roles.map((r: any) => r.id);
      let fixedPersonsMap: Map<string, string[]> = new Map();

      if (roleIds.length > 0) {
        const { data: fixedPersons } = await supabaseClient
          .from(this.fixedPersonsTableName)
          .select('team_role_id, person_id')
          .in('team_role_id', roleIds);

        if (fixedPersons) {
          for (const fp of fixedPersons) {
            const current = fixedPersonsMap.get(fp.team_role_id) || [];
            current.push(fp.person_id);
            fixedPersonsMap.set(fp.team_role_id, current);
          }
        }
      }

      result.roles = data.roles.map((role: any) => {
        const roleDto: TeamRoleDto = {
          id: role.id,
          responsibilityId: role.responsibility_id,
          responsibilityName: role.responsibility?.name || '',
          quantity: role.quantity,
          priority: role.priority,
          isFree: role.is_free,
          fixedPersonIds: fixedPersonsMap.get(role.id) || [],
        };
        return roleDto;
      });

      // Ordena roles por prioridade
      result.roles.sort((a, b) => a.priority - b.priority);
    }

    return result;
  }
}

