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

    // Contar participantes para cada schedule
    const schedulesWithCounts = await Promise.all(
      (data || []).map(async (schedule: any) => {
        const participantsCount = await this.countParticipants(schedule.id);
        return {
          ...this.mapToResponseDto(schedule),
          participantsCount,
        };
      }),
    );

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

    return {
      ...this.mapToResponseDto(schedule),
      participantsCount: await this.countParticipants(scheduleId),
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
  ): Promise<ScheduleDetailsResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se existe
    const existing = await this.findOne(scheduledAreaId, scheduleId);

    // Se for uma escala gerada automaticamente, só pode atualizar status
    if (existing.scheduleGenerationId) {
      if (updateScheduleDto.startDatetime || updateScheduleDto.endDatetime) {
        throw new BadRequestException(
          'Cannot update startDatetime or endDatetime for automatically generated schedules',
        );
      }
    }

    // Validar datas se fornecidas
    if (updateScheduleDto.startDatetime && updateScheduleDto.endDatetime) {
      const startDatetime = new Date(updateScheduleDto.startDatetime);
      const endDatetime = new Date(updateScheduleDto.endDatetime);

      if (endDatetime <= startDatetime) {
        throw new BadRequestException('endDatetime must be after startDatetime');
      }
    }

    const updateData: any = {};
    if (updateScheduleDto.startDatetime) {
      updateData.start_datetime = updateScheduleDto.startDatetime;
    }
    if (updateScheduleDto.endDatetime) {
      updateData.end_datetime = updateScheduleDto.endDatetime;
    }
    if (updateScheduleDto.status) {
      updateData.status = updateScheduleDto.status;
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

  private async createScheduleTeam(scheduleId: string, teamId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

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
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { error } = await supabaseClient.from('schedule_team_assignments').insert(
      assignments.map((assignment) => ({
        schedule_id: scheduleId,
        person_id: assignment.personId,
        team_role_id: assignment.teamRoleId,
      })),
    );

    if (error) {
      handleSupabaseError(error);
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
        'id, person_id, responsibility_id, status, persons(id, full_name, email, photo_url), responsibilities(id, name, description, image_url)',
      )
      .eq('schedule_id', scheduleId);

    // Buscar comentários
    const { data: comments } = await supabaseClient
      .from('schedule_comments')
      .select('id, content, author_id, created_at, updated_at, persons!schedule_comments_author_id_fkey(id, full_name)')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });

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
        createdAt: m.created_at,
      })),
      comments: (comments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        authorId: c.author_id,
        authorName: c.persons?.full_name || 'Unknown',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    };
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
}

