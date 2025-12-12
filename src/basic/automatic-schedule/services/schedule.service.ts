import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleResponseDto,
  PaginatedScheduleResponseDto,
  ScheduleDetailsResponseDto,
} from '../dto/schedule-response.dto';
import { SchedulePreviewDto } from '../dto/generation-preview.dto';
import { GenerationConfigurationDto } from '../dto/generation-configuration.dto';
import {
  PaginatedScheduleOptimizedResponseDto,
  ScheduleOptimizedResponseDto,
  PersonInScheduleDto,
} from '../dto/schedule-optimized-response.dto';

@Injectable()
export class ScheduleService {
  private readonly tableName = 'schedules';

  constructor(private supabaseService: SupabaseService) {}

  async findAll(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      scheduleGenerationId?: string;
      startDate?: string;
      endDate?: string;
      personId?: string;
      groupId?: string;
      teamId?: string;
      status?: string;
    },
  ): Promise<PaginatedScheduleResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('scheduled_area_id', scheduledAreaId);

    if (filters?.scheduleGenerationId) {
      query = query.eq('schedule_generation_id', filters.scheduleGenerationId);
    }

    if (filters?.startDate) {
      query = query.gte('start_datetime', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('end_datetime', filters.endDate);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Filtros por person, group ou team requerem joins
    if (filters?.personId) {
      query = query.or(
        `schedule_members.person_id.eq.${filters.personId},schedule_team_assignments.person_id.eq.${filters.personId}`,
      );
    }

    if (filters?.groupId) {
      query = query.eq('schedule_groups.group_id', filters.groupId);
    }

    if (filters?.teamId) {
      query = query.eq('schedule_teams.team_id', filters.teamId);
    }

    const { data, error, count } = await query
      .order('start_datetime', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    // Buscar participantes para cada schedule (otimizado - busca todos de uma vez)
    const scheduleIds = (data || []).map((s: any) => s.id);
    const participantsMap = await this.getParticipantsMap(scheduleIds);

    // Buscar logs para todas as schedules
    const logsMap = await this.getLogsMap(scheduleIds);

    // Contar participantes e incluir lista de participantes para cada schedule
    const schedulesWithCounts = (data || []).map((schedule: any) => {
      const participants = participantsMap.get(schedule.id) || [];
      const logs = logsMap.get(schedule.id) || [];
      return {
        ...this.mapToResponseDto(schedule),
        participantsCount: participants.length,
        participants: participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
        })),
        logs: logs,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: schedulesWithCounts,
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
    scheduleId: string,
  ): Promise<ScheduleDetailsResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data: schedule, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', scheduleId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Schedule not found');
      }
      handleSupabaseError(error);
    }

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Buscar detalhes completos
    const details = await this.getScheduleDetails(scheduleId);
    
    // Buscar logs
    const logs = await this.getLogsForSchedule(scheduleId);

    return {
      ...this.mapToResponseDto(schedule),
      participantsCount: await this.countParticipants(scheduleId),
      logs: logs,
      ...details,
    };
  }

  async create(
    scheduledAreaId: string,
    createScheduleDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Validar datas
    const startDatetime = new Date(createScheduleDto.startDatetime);
    const endDatetime = new Date(createScheduleDto.endDatetime);

    if (endDatetime <= startDatetime) {
      throw new BadRequestException('endDatetime must be after startDatetime');
    }

    // Validar tipo e dados relacionados
    if (createScheduleDto.scheduleType === 'group') {
      if (!createScheduleDto.groupIds || createScheduleDto.groupIds.length === 0) {
        throw new BadRequestException('groupIds is required for group schedule type');
      }
    } else if (createScheduleDto.scheduleType === 'team') {
      if (!createScheduleDto.teamId) {
        throw new BadRequestException('teamId is required for team schedule type');
      }
      if (!createScheduleDto.assignments || createScheduleDto.assignments.length === 0) {
        throw new BadRequestException('assignments is required for team schedule type');
      }
    } else if (createScheduleDto.scheduleType === 'individual') {
      if (!createScheduleDto.memberIds || createScheduleDto.memberIds.length === 0) {
        throw new BadRequestException('memberIds is required for individual schedule type');
      }
    }

    // Criar schedule
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from(this.tableName)
      .insert({
        schedule_generation_id: null,
        scheduled_area_id: scheduledAreaId,
        start_datetime: startDatetime.toISOString(),
        end_datetime: endDatetime.toISOString(),
        schedule_type: createScheduleDto.scheduleType,
        status: 'pending',
      })
      .select()
      .single();

    if (scheduleError) {
      handleSupabaseError(scheduleError);
    }

    // Criar relacionamentos
    if (createScheduleDto.scheduleType === 'group') {
      await this.createScheduleGroups(schedule.id, createScheduleDto.groupIds!);
    } else if (createScheduleDto.scheduleType === 'team') {
      await this.createScheduleTeam(schedule.id, createScheduleDto.teamId!);
      await this.createScheduleTeamAssignments(
        schedule.id,
        createScheduleDto.assignments!,
      );
    } else if (createScheduleDto.scheduleType === 'individual') {
      // Membros individuais serão criados através do endpoint de membros
    }

    const participantsCount = await this.countParticipants(schedule.id);

    return {
      ...this.mapToResponseDto(schedule),
      participantsCount,
    };
  }

  async update(
    scheduledAreaId: string,
    scheduleId: string,
    updateScheduleDto: UpdateScheduleDto,
    changedBy?: string,
  ): Promise<ScheduleDetailsResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se existe
    const existing = await this.findOne(scheduledAreaId, scheduleId);

    // Validar datas se fornecidas
    if (updateScheduleDto.startDatetime && updateScheduleDto.endDatetime) {
      const startDatetime = new Date(updateScheduleDto.startDatetime);
      const endDatetime = new Date(updateScheduleDto.endDatetime);

      if (endDatetime <= startDatetime) {
        throw new BadRequestException('endDatetime must be after startDatetime');
      }
    }

    const updateData: any = {};
    
    // Criar logs para mudanças - sempre logar quando houver mudança
    if (updateScheduleDto.startDatetime !== undefined) {
      const newStart = new Date(updateScheduleDto.startDatetime).toISOString();
      const oldStart = new Date(existing.startDatetime).toISOString();
      
      if (newStart !== oldStart) {
        updateData.start_datetime = updateScheduleDto.startDatetime;
        await this.createLog(scheduleId, null, null, 'schedule_start_date_changed', {
          startDatetime: existing.startDatetime,
        }, {
          startDatetime: updateScheduleDto.startDatetime,
        }, changedBy);
      }
    }
    
    if (updateScheduleDto.endDatetime !== undefined) {
      const newEnd = new Date(updateScheduleDto.endDatetime).toISOString();
      const oldEnd = new Date(existing.endDatetime).toISOString();
      
      if (newEnd !== oldEnd) {
        updateData.end_datetime = updateScheduleDto.endDatetime;
        await this.createLog(scheduleId, null, null, 'schedule_end_date_changed', {
          endDatetime: existing.endDatetime,
        }, {
          endDatetime: updateScheduleDto.endDatetime,
        }, changedBy);
      }
    }
    
    if (updateScheduleDto.status !== undefined && updateScheduleDto.status !== existing.status) {
      updateData.status = updateScheduleDto.status;
      await this.createLog(scheduleId, null, null, 'schedule_status_changed', {
        status: existing.status,
      }, {
        status: updateScheduleDto.status,
      }, changedBy);
    }

    // Se não há mudanças, retornar sem atualizar
    if (Object.keys(updateData).length === 0) {
      const details = await this.getScheduleDetails(scheduleId);
      return {
        ...this.mapToResponseDto(existing as any),
        participantsCount: await this.countParticipants(scheduleId),
        ...details,
      };
    }

    const { data: schedule, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', scheduleId)
      .eq('scheduled_area_id', scheduledAreaId)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    const details = await this.getScheduleDetails(scheduleId);

    return {
      ...this.mapToResponseDto(schedule),
      participantsCount: await this.countParticipants(scheduleId),
      ...details,
    };
  }

  async remove(scheduledAreaId: string, scheduleId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se existe e se é manual
    const existing = await this.findOne(scheduledAreaId, scheduleId);

    if (existing.scheduleGenerationId) {
      throw new BadRequestException(
        'Cannot delete automatically generated schedule. Delete the schedule generation instead.',
      );
    }

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', scheduleId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  async createSchedulesFromGeneration(
    generationId: string,
    scheduledAreaId: string,
    previewSchedules: SchedulePreviewDto[],
    config: GenerationConfigurationDto,
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();
    const createdSchedules: any[] = [];

    for (const preview of previewSchedules) {
      // Criar schedule
      const { data: schedule, error: scheduleError } = await supabaseClient
        .from(this.tableName)
        .insert({
          schedule_generation_id: generationId,
          scheduled_area_id: scheduledAreaId,
          start_datetime: preview.startDatetime,
          end_datetime: preview.endDatetime,
          schedule_type: this.determineScheduleType(config),
          status: 'pending',
        })
        .select()
        .single();

      if (scheduleError) {
        handleSupabaseError(scheduleError);
      }

      // Criar relacionamentos baseado no tipo
      if (preview.groups && preview.groups.length > 0) {
        await this.createScheduleGroups(
          schedule.id,
          preview.groups.map((g) => g.id),
        );
      }

      if (preview.team) {
        await this.createScheduleTeam(schedule.id, preview.team.id);
      }

      if (preview.assignments && preview.assignments.length > 0) {
        await this.createScheduleTeamAssignments(
          schedule.id,
          preview.assignments
            .filter((a) => a.personId)
            .map((a) => ({
              personId: a.personId,
              teamRoleId: a.roleId,
            })),
        );
      }

      createdSchedules.push(schedule);
    }

    return createdSchedules;
  }

  private determineScheduleType(config: GenerationConfigurationDto): string {
    if (config.generationType === 'group') {
      return 'group';
    } else if (
      config.generationType === 'team_without_restriction' ||
      config.generationType === 'team_with_restriction'
    ) {
      return 'team';
    } else {
      return 'individual';
    }
  }

  private async createScheduleGroups(
    scheduleId: string,
    groupIds: string[],
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { error } = await supabaseClient.from('schedule_groups').insert(
      groupIds.map((groupId) => ({
        schedule_id: scheduleId,
        group_id: groupId,
      })),
    );

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async createScheduleTeam(scheduleId: string, teamId: string, changedBy?: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se já existe uma equipe
    const { data: existing } = await supabaseClient
      .from('schedule_teams')
      .select('team_id')
      .eq('schedule_id', scheduleId)
      .single();

    if (existing && existing.team_id !== teamId) {
      // Log de mudança de equipe
      await this.createLog(scheduleId, null, null, 'team_changed', {
        teamId: existing.team_id,
      }, {
        teamId: teamId,
      }, changedBy);

      // Remover equipe antiga
      await supabaseClient
        .from('schedule_teams')
        .delete()
        .eq('schedule_id', scheduleId);
    }

    const { error } = await supabaseClient
      .from('schedule_teams')
      .insert({
        schedule_id: scheduleId,
        team_id: teamId,
      });

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async createScheduleTeamAssignments(
    scheduleId: string,
    assignments: Array<{ personId: string; teamRoleId: string }>,
    changedBy?: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar atribuições existentes
    const { data: existingAssignments } = await supabaseClient
      .from('schedule_team_assignments')
      .select('person_id, team_role_id')
      .eq('schedule_id', scheduleId);

    const existingSet = new Set(
      (existingAssignments || []).map((a: any) => `${a.person_id}-${a.team_role_id}`)
    );

    // Identificar novas atribuições
    const newAssignments = assignments.filter(
      (a) => !existingSet.has(`${a.personId}-${a.teamRoleId}`)
    );

    // Identificar atribuições removidas
    const assignmentSet = new Set(
      assignments.map((a) => `${a.personId}-${a.teamRoleId}`)
    );
    const removedAssignments = (existingAssignments || []).filter(
      (a: any) => !assignmentSet.has(`${a.person_id}-${a.team_role_id}`)
    );

    // Criar logs para remoções
    for (const removed of removedAssignments) {
      await this.createLog(scheduleId, null, removed.person_id, 'team_member_removed', {
        personId: removed.person_id,
        teamRoleId: removed.team_role_id,
      }, null, changedBy);
    }

    // Remover atribuições antigas que não estão mais na lista
    if (removedAssignments.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('schedule_team_assignments')
        .delete()
        .eq('schedule_id', scheduleId)
        .in('person_id', removedAssignments.map((a: any) => a.person_id))
        .in('team_role_id', removedAssignments.map((a: any) => a.team_role_id));

      if (deleteError) {
        handleSupabaseError(deleteError);
      }
    }

    // Inserir novas atribuições
    if (newAssignments.length > 0) {
      const { error } = await supabaseClient.from('schedule_team_assignments').insert(
        newAssignments.map((assignment) => ({
          schedule_id: scheduleId,
          person_id: assignment.personId,
          team_role_id: assignment.teamRoleId,
        })),
      );

      if (error) {
        handleSupabaseError(error);
      }

      // Criar logs para novas atribuições
      for (const assignment of newAssignments) {
        await this.createLog(scheduleId, null, assignment.personId, 'team_member_added', null, {
          personId: assignment.personId,
          teamRoleId: assignment.teamRoleId,
        }, changedBy);
      }
    }
  }

  private async countParticipants(scheduleId: string): Promise<number> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Contar membros
    const membersResult = await supabaseClient
      .from('schedule_members')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId);

    // Contar atribuições de equipe
    const assignmentsResult = await supabaseClient
      .from('schedule_team_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId);

    const membersCount = (membersResult as any).count || 0;
    const assignmentsCount = (assignmentsResult as any).count || 0;

    return membersCount + assignmentsCount;
  }

  /**
   * Busca todos os participantes de múltiplas schedules de uma vez (otimizado)
   * Retorna um mapa de schedule_id -> array de participantes
   */
  private async getParticipantsMap(
    scheduleIds: string[],
  ): Promise<Map<string, Array<{ id: string; name: string; imageUrl: string | null }>>> {
    if (scheduleIds.length === 0) {
      return new Map();
    }

    const supabaseClient = this.supabaseService.getRawClient();
    const participantsMap = new Map<
      string,
      Array<{ id: string; name: string; imageUrl: string | null }>
    >();

    // Inicializar mapas vazios para cada schedule
    scheduleIds.forEach((id) => {
      participantsMap.set(id, []);
    });

    // Buscar membros (schedule_members)
    const { data: members } = await supabaseClient
      .from('schedule_members')
      .select('schedule_id, person_id, persons(id, full_name, photo_url)')
      .in('schedule_id', scheduleIds);

    if (members && members.length > 0) {
      members.forEach((m: any) => {
        const scheduleId = m.schedule_id;
        const person = m.persons;
        if (person && scheduleId) {
          const existing = participantsMap.get(scheduleId) || [];
          // Verificar se a pessoa já foi adicionada (evitar duplicatas)
          if (!existing.some((p) => p.id === person.id)) {
            existing.push({
              id: person.id,
              name: person.full_name || '',
              imageUrl: person.photo_url || null,
            });
            participantsMap.set(scheduleId, existing);
          }
        }
      });
    }

    // Buscar atribuições de equipe (schedule_team_assignments)
    const { data: assignments } = await supabaseClient
      .from('schedule_team_assignments')
      .select('schedule_id, person_id, persons(id, full_name, photo_url)')
      .in('schedule_id', scheduleIds);

    if (assignments && assignments.length > 0) {
      assignments.forEach((a: any) => {
        const scheduleId = a.schedule_id;
        const person = a.persons;
        if (person && scheduleId) {
          const existing = participantsMap.get(scheduleId) || [];
          // Verificar se a pessoa já foi adicionada (evitar duplicatas)
          if (!existing.some((p) => p.id === person.id)) {
            existing.push({
              id: person.id,
              name: person.full_name || '',
              imageUrl: person.photo_url || null,
            });
            participantsMap.set(scheduleId, existing);
          }
        }
      });
    }

    return participantsMap;
  }

  private async getScheduleDetails(scheduleId: string): Promise<any> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar grupos com membros
    const { data: groups } = await supabaseClient
      .from('schedule_groups')
      .select(
        `
        group_id,
        area_groups(
          id,
          name,
          members:area_group_members(
            id,
            person:persons(id, full_name, email, photo_url),
            responsibilities:area_group_member_responsibilities(
              responsibility:responsibilities(id, name, description, image_url)
            )
          )
        )
      `,
      )
      .eq('schedule_id', scheduleId);

    // Buscar equipe
    const { data: teamData } = await supabaseClient
      .from('schedule_teams')
      .select('team_id, area_teams(id, name)')
      .eq('schedule_id', scheduleId)
      .single();

    // Buscar atribuições de equipe
    const { data: assignments } = await supabaseClient
      .from('schedule_team_assignments')
      .select(
        'id, person_id, team_role_id, persons(id, full_name, email, photo_url), area_team_roles(id, responsibility_id, quantity, priority, is_free, responsibilities(id, name, image_url))',
      )
      .eq('schedule_id', scheduleId);

    // Buscar membros
    const { data: members } = await supabaseClient
      .from('schedule_members')
      .select(
        'id, person_id, responsibility_id, status, present, persons(id, full_name, email, photo_url), responsibilities(id, name, description, image_url)',
      )
      .eq('schedule_id', scheduleId);

    // Buscar comentários
    // Nota: author_id referencia auth.users(id), não persons(id)
    // Não podemos fazer join direto com auth.users, então buscamos apenas os dados básicos
    const { data: comments, error: commentsError } = await supabaseClient
      .from('schedule_comments')
      .select('id, content, author_id, created_at, updated_at')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });
    
    // Se houver erro, logar mas não falhar (comentários são opcionais)
    if (commentsError) {
      console.error('Error fetching comments in getScheduleDetails:', commentsError);
    }

    return {
      groups: (groups || []).map((g: any) => {
        const groupData: any = {
          id: g.area_groups.id,
          name: g.area_groups.name,
          members: [],
        };

        // Processar membros do grupo
        if (g.area_groups.members && Array.isArray(g.area_groups.members)) {
          groupData.members = g.area_groups.members.map((member: any) => {
            const memberData: any = {
              personId: member.person?.id || '',
              personName: member.person?.full_name || '',
              personPhotoUrl: member.person?.photo_url || null,
              responsibilities: [],
            };

            // Processar responsabilidades do membro
            if (
              member.responsibilities &&
              Array.isArray(member.responsibilities)
            ) {
              memberData.responsibilities = member.responsibilities.map(
                (resp: any) => ({
                  id: resp.responsibility?.id || '',
                  name: resp.responsibility?.name || '',
                  imageUrl: resp.responsibility?.image_url || null,
                }),
              );
            }

            return memberData;
          });
        }

        return groupData;
      }),
      team: teamData && (teamData as any).area_teams
        ? {
            id: (teamData as any).area_teams.id,
            name: (teamData as any).area_teams.name,
          }
        : null,
      assignments: (assignments || []).map((a: any) => ({
        id: a.id,
        personId: a.person_id,
        person: a.persons
          ? {
              id: a.persons.id,
              fullName: a.persons.full_name,
              email: a.persons.email,
              photoUrl: a.persons.photo_url,
            }
          : null,
        teamRoleId: a.team_role_id,
        teamRole: a.area_team_roles
          ? {
              id: a.area_team_roles.id,
              responsibilityId: a.area_team_roles.responsibility_id,
              responsibilityName: a.area_team_roles.responsibilities?.name,
              priority: a.area_team_roles.priority,
              quantity: a.area_team_roles.quantity,
              isFree: a.area_team_roles.is_free,
            }
          : null,
        createdAt: a.created_at,
      })),
      members: (members || []).map((m: any) => ({
        id: m.id,
        personId: m.person_id,
        person: m.persons
          ? {
              id: m.persons.id,
              fullName: m.persons.full_name,
              email: m.persons.email,
              photoUrl: m.persons.photo_url,
            }
          : null,
        responsibilityId: m.responsibility_id,
        responsibility: m.responsibilities
          ? {
              id: m.responsibilities.id,
              name: m.responsibilities.name,
              description: m.responsibilities.description,
              imageUrl: m.responsibilities.image_url,
            }
          : null,
        status: m.status,
        present: m.present ?? null,
        createdAt: m.created_at,
      })),
      comments: (comments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        authorId: c.author_id,
        // author_id referencia auth.users, não persons
        // Por enquanto retornamos 'Unknown', mas pode ser melhorado buscando do auth.users
        authorName: 'Unknown',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    };
  }

  private async getLogsMap(
    scheduleIds: string[],
  ): Promise<Map<string, Array<{ id: string; changeType: string; oldValue?: any; newValue?: any; changedBy?: string | null; message?: string | null; createdAt: string }>>> {
    if (scheduleIds.length === 0) {
      return new Map();
    }

    const supabaseClient = this.supabaseService.getRawClient();
    const logsMap = new Map<string, Array<any>>();

    // Inicializar mapas vazios para cada schedule
    scheduleIds.forEach((id) => {
      logsMap.set(id, []);
    });

    const { data: logs } = await supabaseClient
      .from('schedule_logs')
      .select('*')
      .in('schedule_id', scheduleIds)
      .order('created_at', { ascending: false });

    if (logs && logs.length > 0) {
      logs.forEach((log: any) => {
        const scheduleId = log.schedule_id;
        const existing = logsMap.get(scheduleId) || [];
        existing.push({
          id: log.id,
          changeType: log.change_type,
          oldValue: log.old_value || undefined,
          newValue: log.new_value || undefined,
          changedBy: log.changed_by,
          message: log.message || null,
          createdAt: log.created_at,
        });
        logsMap.set(scheduleId, existing);
      });
    }

    return logsMap;
  }

  private async getLogsForSchedule(
    scheduleId: string,
  ): Promise<Array<{ id: string; changeType: string; oldValue?: any; newValue?: any; changedBy?: string | null; message?: string | null; createdAt: string }>> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data: logs } = await supabaseClient
      .from('schedule_logs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });

    return (logs || []).map((log: any) => ({
      id: log.id,
      changeType: log.change_type,
      oldValue: log.old_value || undefined,
      newValue: log.new_value || undefined,
      changedBy: log.changed_by,
      message: log.message || null,
      createdAt: log.created_at,
    }));
  }

  private mapToResponseDto(data: any): ScheduleResponseDto {
    return {
      id: data.id,
      scheduleGenerationId: data.schedule_generation_id,
      scheduledAreaId: data.scheduled_area_id,
      startDatetime: data.start_datetime,
      endDatetime: data.end_datetime,
      scheduleType: data.schedule_type,
      status: data.status,
      participantsCount: 0, // Será preenchido depois
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async createLog(
    scheduleId: string,
    scheduleMemberId: string | null,
    personId: string | null,
    changeType: string,
    oldValue: any,
    newValue: any,
    changedBy?: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se changedBy existe na tabela persons antes de inserir
    let validChangedBy: string | null = null;
    if (changedBy) {
      const { data: person } = await supabaseClient
        .from('persons')
        .select('id')
        .eq('id', changedBy)
        .single();

      if (person) {
        validChangedBy = changedBy;
      }
      // Se não existir, simplesmente não incluir o changed_by (será null)
    }

    // Gerar mensagem em português
    const message = await this.generateLogMessage(
      changeType,
      oldValue,
      newValue,
      personId,
      supabaseClient,
    );

    const { error } = await supabaseClient
      .from('schedule_logs')
      .insert({
        schedule_id: scheduleId,
        schedule_member_id: scheduleMemberId,
        person_id: personId,
        change_type: changeType,
        old_value: oldValue || null,
        new_value: newValue || null,
        message: message,
        changed_by: validChangedBy,
      });

    if (error) {
      // Não falhar a operação principal se o log falhar, apenas logar o erro
      console.error('Error creating schedule_log:', error);
    }
  }

  private async generateLogMessage(
    changeType: string,
    oldValue: any,
    newValue: any,
    personId: string | null,
    supabaseClient: any,
  ): Promise<string | null> {
    try {
      switch (changeType) {
        case 'schedule_start_date_changed': {
          const oldDate = oldValue?.startDatetime
            ? new Date(oldValue.startDatetime).toLocaleString('pt-BR')
            : 'Não definida';
          const newDate = newValue?.startDatetime
            ? new Date(newValue.startDatetime).toLocaleString('pt-BR')
            : 'Não definida';
          return `Data/hora de início da escala foi alterada de "${oldDate}" para "${newDate}"`;
        }

        case 'schedule_end_date_changed': {
          const oldDate = oldValue?.endDatetime
            ? new Date(oldValue.endDatetime).toLocaleString('pt-BR')
            : 'Não definida';
          const newDate = newValue?.endDatetime
            ? new Date(newValue.endDatetime).toLocaleString('pt-BR')
            : 'Não definida';
          return `Data/hora de término da escala foi alterada de "${oldDate}" para "${newDate}"`;
        }

        case 'schedule_status_changed': {
          const oldStatus = this.translateScheduleStatus(oldValue?.status);
          const newStatus = this.translateScheduleStatus(newValue?.status);
          return `Status da escala foi alterado de "${oldStatus}" para "${newStatus}"`;
        }

        case 'team_changed': {
          const oldTeam = oldValue?.teamId
            ? await this.getTeamName(oldValue.teamId, supabaseClient)
            : 'Não definida';
          const newTeam = newValue?.teamId
            ? await this.getTeamName(newValue.teamId, supabaseClient)
            : 'Não definida';
          return `Equipe da escala foi alterada de "${oldTeam}" para "${newTeam}"`;
        }

        case 'team_member_added': {
          const personName = newValue?.personId
            ? await this.getPersonName(newValue.personId, supabaseClient)
            : 'Membro';
          const roleName = newValue?.teamRoleId
            ? await this.getTeamRoleName(newValue.teamRoleId, supabaseClient)
            : null;
          return roleName
            ? `${personName} foi adicionado(a) à equipe como ${roleName}`
            : `${personName} foi adicionado(a) à equipe`;
        }

        case 'team_member_removed': {
          const personName = oldValue?.personId
            ? await this.getPersonName(oldValue.personId, supabaseClient)
            : 'Membro';
          return `${personName} foi removido(a) da equipe`;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error('Error generating log message:', error);
      return null;
    }
  }

  private async getPersonName(personId: string, supabaseClient: any): Promise<string> {
    try {
      const { data } = await supabaseClient
        .from('persons')
        .select('full_name')
        .eq('id', personId)
        .single();
      return data?.full_name || 'Membro';
    } catch {
      return 'Membro';
    }
  }

  private async getTeamName(teamId: string, supabaseClient: any): Promise<string> {
    try {
      const { data } = await supabaseClient
        .from('area_teams')
        .select('name')
        .eq('id', teamId)
        .single();
      return data?.name || 'Equipe não encontrada';
    } catch {
      return 'Equipe não encontrada';
    }
  }

  private async getTeamRoleName(teamRoleId: string, supabaseClient: any): Promise<string> {
    try {
      // Primeiro buscar o responsibility_id
      const { data: teamRole } = await supabaseClient
        .from('area_team_roles')
        .select('responsibility_id')
        .eq('id', teamRoleId)
        .single();

      if (!teamRole?.responsibility_id) {
        return 'Função não encontrada';
      }

      // Depois buscar o nome da responsabilidade
      const { data: responsibility } = await supabaseClient
        .from('responsibilities')
        .select('name')
        .eq('id', teamRole.responsibility_id)
        .single();

      return responsibility?.name || 'Função não encontrada';
    } catch {
      return 'Função não encontrada';
    }
  }

  private translateScheduleStatus(status: string): string {
    const translations: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
    };
    return translations[status] || status;
  }

  async findAllOptimized(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedScheduleOptimizedResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    // Query base para buscar escalas
    let query = supabaseClient
      .from(this.tableName)
      .select('id, start_datetime, end_datetime', { count: 'exact' })
      .eq('scheduled_area_id', scheduledAreaId)
      .neq('status', 'cancelled');

    // Aplicar filtros de data
    if (startDate) {
      query = query.gte('start_datetime', startDate);
    }

    if (endDate) {
      query = query.lte('end_datetime', endDate);
    }

    // Buscar escalas paginadas ordenadas por data
    const { data: schedules, error, count } = await query
      .order('start_datetime', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    if (!schedules || schedules.length === 0) {
      return {
        data: [],
        meta: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      };
    }

    const scheduleIds = schedules.map((s: any) => s.id);

    // Buscar todas as pessoas relacionadas em batch
    const pessoasMap = await this.getPessoasMapOptimized(scheduleIds);

    // Montar resposta (remover personId temporário antes de retornar)
    const data: ScheduleOptimizedResponseDto[] = schedules.map((schedule: any) => {
      const pessoas = (pessoasMap.get(schedule.id) || []).map((p: any) => {
        const { personId, ...pessoa } = p;
        return pessoa;
      });
      return {
        id: schedule.id,
        startDatetime: schedule.start_datetime,
        endDatetime: schedule.end_datetime,
        pessoas: pessoas,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  /**
   * Busca todas as pessoas relacionadas às escalas de forma otimizada
   * Agrega pessoas de: schedule_members, schedule_team_assignments e grupos
   */
  private async getPessoasMapOptimized(
    scheduleIds: string[],
  ): Promise<Map<string, PersonInScheduleDto[]>> {
    if (scheduleIds.length === 0) {
      return new Map();
    }

    const supabaseClient = this.supabaseService.getRawClient();
    const pessoasMap = new Map<string, PersonInScheduleDto[]>();

    // Inicializar mapas vazios para cada schedule
    scheduleIds.forEach((id) => {
      pessoasMap.set(id, []);
    });

    // 1. Buscar schedule_members (pessoas diretamente atribuídas)
    const { data: members } = await supabaseClient
      .from('schedule_members')
      .select(
        'schedule_id, person_id, status, present, persons(id, full_name, photo_url), responsibilities(id, name)',
      )
      .in('schedule_id', scheduleIds);

    if (members && members.length > 0) {
      members.forEach((m: any) => {
        const scheduleId = m.schedule_id;
        const person = m.persons;
        // O Supabase retorna responsibilities como objeto único (não array) quando há foreign key direta
        const responsibility = m.responsibilities
          ? (Array.isArray(m.responsibilities) ? m.responsibilities[0] : m.responsibilities)
          : null;

        if (person && scheduleId) {
          const existing = pessoasMap.get(scheduleId) || [];
          // Verificar se a pessoa já foi adicionada (evitar duplicatas por person_id)
          const personIds = existing.map((p: any) => (p as any).personId).filter(Boolean);
          if (!personIds.includes(person.id)) {
            const pessoa: PersonInScheduleDto & { personId?: string } = {
              nome: person.full_name || '',
              url: person.photo_url || null,
              função: responsibility?.name || '',
              present: m.present ?? null,
              status: m.status || 'pending',
            };
            (pessoa as any).personId = person.id; // Armazenar temporariamente para verificação
            existing.push(pessoa);
            pessoasMap.set(scheduleId, existing);
          }
        }
      });
    }

    // 2. Buscar schedule_team_assignments (pessoas atribuídas via equipe)
    const { data: assignments } = await supabaseClient
      .from('schedule_team_assignments')
      .select(
        'schedule_id, person_id, persons(id, full_name, photo_url), area_team_roles(id, responsibility_id, responsibilities(id, name))',
      )
      .in('schedule_id', scheduleIds);

    if (assignments && assignments.length > 0) {
      assignments.forEach((a: any) => {
        const scheduleId = a.schedule_id;
        const person = a.persons;
        const teamRole = a.area_team_roles;
        // O Supabase pode retornar responsibilities como objeto único ou array
        const responsibility = teamRole?.responsibilities
          ? (Array.isArray(teamRole.responsibilities)
              ? teamRole.responsibilities[0]
              : teamRole.responsibilities)
          : null;

        if (person && scheduleId) {
          const existing = pessoasMap.get(scheduleId) || [];
          // Verificar se a pessoa já foi adicionada (evitar duplicatas por person_id)
          const personIds = existing.map((p: any) => (p as any).personId).filter(Boolean);
          if (!personIds.includes(person.id)) {
            const pessoa: PersonInScheduleDto & { personId?: string } = {
              nome: person.full_name || '',
              url: person.photo_url || null,
              função: responsibility?.name || '',
              present: null, // Team assignments não têm present/status direto
              status: 'accepted', // Assumir accepted para team assignments
            };
            (pessoa as any).personId = person.id; // Armazenar temporariamente para verificação
            existing.push(pessoa);
            pessoasMap.set(scheduleId, existing);
          }
        }
      });
    }

    // 3. Buscar pessoas de grupos (schedule_groups → area_groups → area_group_members)
    // Primeiro, buscar quais grupos estão associados a cada schedule
    const { data: scheduleGroups } = await supabaseClient
      .from('schedule_groups')
      .select('schedule_id, group_id')
      .in('schedule_id', scheduleIds);

    if (scheduleGroups && scheduleGroups.length > 0) {
      // Agrupar group_ids por schedule_id
      const groupIdsBySchedule = new Map<string, string[]>();
      scheduleGroups.forEach((sg: any) => {
        const scheduleId = sg.schedule_id;
        const groupId = sg.group_id;
        const existing = groupIdsBySchedule.get(scheduleId) || [];
        existing.push(groupId);
        groupIdsBySchedule.set(scheduleId, existing);
      });

      // Buscar todos os group_ids únicos
      const allGroupIds = Array.from(
        new Set(
          Array.from(groupIdsBySchedule.values()).flat(),
        ),
      );

      if (allGroupIds.length > 0) {
        // Buscar membros dos grupos com suas responsabilidades
        const { data: groupMembers } = await supabaseClient
          .from('area_group_members')
          .select(
            'group_id, person_id, persons(id, full_name, photo_url), responsibilities:area_group_member_responsibilities(responsibility:responsibilities(id, name))',
          )
          .in('group_id', allGroupIds);

        if (groupMembers && groupMembers.length > 0) {
          // Para cada schedule, adicionar membros dos seus grupos
          groupIdsBySchedule.forEach((groupIds, scheduleId) => {
            const existing = pessoasMap.get(scheduleId) || [];

            groupMembers.forEach((gm: any) => {
              // Verificar se este membro pertence a um grupo desta escala
              if (groupIds.includes(gm.group_id)) {
                const person = gm.persons;
                const responsibilities = gm.responsibilities || [];
                // Pegar a primeira responsabilidade (ou vazio se não houver)
                const responsibility = Array.isArray(responsibilities) && responsibilities.length > 0
                  ? responsibilities[0]?.responsibility
                  : null;

                if (person) {
                  // Verificar se a pessoa já foi adicionada (evitar duplicatas por person_id)
                  const personIds = existing.map((p: any) => (p as any).personId).filter(Boolean);
                  if (!personIds.includes(person.id)) {
                    const pessoa: PersonInScheduleDto & { personId?: string } = {
                      nome: person.full_name || '',
                      url: person.photo_url || null,
                      função: responsibility?.name || '',
                      present: null, // Membros de grupos não têm present/status direto na escala
                      status: 'accepted', // Assumir accepted para membros de grupos
                    };
                    (pessoa as any).personId = person.id; // Armazenar temporariamente para verificação
                    existing.push(pessoa);
                  }
                }
              }
            });

            pessoasMap.set(scheduleId, existing);
          });
        }
      }
    }

    return pessoasMap;
  }
}

