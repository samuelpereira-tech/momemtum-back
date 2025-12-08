import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import { GenerationConfigurationDto } from '../dto/generation-configuration.dto';
import {
  GenerationPreviewDto,
  SchedulePreviewDto,
  GenerationSummaryDto,
} from '../dto/generation-preview.dto';
import {
  ScheduleGenerationResponseDto,
  PaginatedScheduleGenerationResponseDto,
} from '../dto/schedule-response.dto';
@Injectable()
export class ScheduleGenerationService {
  private readonly tableName = 'schedule_generations';

  constructor(private supabaseService: SupabaseService) {}

  async preview(
    scheduledAreaId: string,
    config: GenerationConfigurationDto,
  ): Promise<GenerationPreviewDto> {
    // Validar que a área agendada existe
    await this.validateScheduledArea(scheduledAreaId);

    // Validar configuração
    this.validateConfiguration(config);

    // Gerar preview das escalas
    const schedules = await this.generatePreviewSchedules(scheduledAreaId, config);

    // Calcular resumo
    const summary = this.calculateSummary(schedules);

    return {
      configuration: config,
      schedules,
      summary,
    };
  }

  async create(
    scheduledAreaId: string,
    config: GenerationConfigurationDto,
    userId?: string,
  ): Promise<ScheduleGenerationResponseDto> {
    // Validar que a área agendada existe
    await this.validateScheduledArea(scheduledAreaId);

    // Validar configuração
    this.validateConfiguration(config);

    // Gerar preview primeiro para validar
    const preview = await this.preview(scheduledAreaId, config);

    // Se houver erros críticos, não criar
    if (preview.summary.errors > 0) {
      throw new BadRequestException(
        'Cannot create schedules with errors. Please fix the configuration.',
      );
    }

    const supabaseClient = this.supabaseService.getRawClient();

    // Validar userId se fornecido
    let validUserId: string | null = null;
    if (userId) {
      const { data: userExists, error: userError } = await supabaseClient
        .from('persons')
        .select('id')
        .eq('id', userId)
        .single();

      if (!userError && userExists) {
        validUserId = userId;
      }
    }

    // Criar registro de geração
    const { data: generation, error: genError } = await supabaseClient
      .from(this.tableName)
      .insert({
        scheduled_area_id: scheduledAreaId,
        generation_type: config.generationType,
        period_type: config.periodType,
        period_start_date: config.periodStartDate,
        period_end_date: config.periodEndDate,
        configuration: config as any,
        total_schedules_generated: preview.schedules.length,
        created_by: validUserId,
      })
      .select()
      .single();

    if (genError) {
      // Log do erro para debug
      console.error('Error creating schedule generation:', genError);
      console.error('Error details:', JSON.stringify(genError, null, 2));
      handleSupabaseError(genError);
    }

    // Criar as escalas (será feito pelo ScheduleService através de injeção no módulo)
    // Por enquanto, vamos criar diretamente aqui para evitar dependência circular
    const createdSchedules = await this.createSchedulesFromGeneration(
      generation.id,
      scheduledAreaId,
      preview.schedules,
      config,
    );

    // Atualizar contador de escalas geradas
    await supabaseClient
      .from(this.tableName)
      .update({ total_schedules_generated: createdSchedules.length })
      .eq('id', generation.id);

    // Buscar todas as escalas criadas com detalhes completos (incluindo membros dos grupos)
    const schedulesWithDetails = await this.getSchedulesWithDetails(
      generation.id,
      scheduledAreaId,
    );

    const response = this.mapToResponseDto(generation);
    return {
      ...response,
      schedules: schedulesWithDetails,
    };
  }

  /**
   * Busca todas as escalas de uma geração com detalhes completos
   */
  private async getSchedulesWithDetails(
    generationId: string,
    scheduledAreaId: string,
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar todas as escalas da geração
    const { data: schedules, error } = await supabaseClient
      .from('schedules')
      .select('id')
      .eq('schedule_generation_id', generationId)
      .eq('scheduled_area_id', scheduledAreaId)
      .order('start_datetime', { ascending: true });

    if (error || !schedules) {
      return [];
    }

    // Para cada escala, buscar os detalhes completos
    const schedulesWithDetails: any[] = [];
    for (const schedule of schedules) {
      const details = await this.getScheduleDetailsForGeneration(schedule.id);
      if (details) {
        schedulesWithDetails.push(details);
      }
    }

    return schedulesWithDetails;
  }

  /**
   * Busca detalhes completos de uma escala (incluindo membros dos grupos)
   */
  private async getScheduleDetailsForGeneration(
    scheduleId: string,
  ): Promise<any> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar dados básicos da escala
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return null;
    }

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

    // Processar grupos com membros
    const processedGroups = (groups || []).map((g: any) => {
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
    });

    return {
      id: schedule.id,
      scheduleGenerationId: schedule.schedule_generation_id,
      scheduledAreaId: schedule.scheduled_area_id,
      startDatetime: schedule.start_datetime,
      endDatetime: schedule.end_datetime,
      scheduleType: schedule.schedule_type,
      status: schedule.status,
      groups: processedGroups,
      team:
        teamData && (teamData as any).area_teams
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
              responsibility: a.area_team_roles.responsibilities
                ? {
                    id: a.area_team_roles.responsibilities.id,
                    name: a.area_team_roles.responsibilities.name,
                    imageUrl: a.area_team_roles.responsibilities.image_url,
                  }
                : null,
            }
          : null,
      })),
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    };
  }

  async findAll(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedScheduleGenerationResponseDto> {
    await this.validateScheduledArea(scheduledAreaId);

    const supabaseClient = this.supabaseService.getRawClient();
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('scheduled_area_id', scheduledAreaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: data.map((item: any) => this.mapToResponseDto(item)),
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
    generationId: string,
  ): Promise<ScheduleGenerationResponseDto> {
    await this.validateScheduledArea(scheduledAreaId);

    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', generationId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Schedule generation not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Schedule generation not found');
    }

    return this.mapToResponseDto(data);
  }

  async remove(scheduledAreaId: string, generationId: string): Promise<void> {
    await this.validateScheduledArea(scheduledAreaId);

    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se existe
    await this.findOne(scheduledAreaId, generationId);

    // Deletar (cascade vai deletar as escalas também)
    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', generationId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async validateScheduledArea(scheduledAreaId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Scheduled area not found');
    }
  }

  private validateConfiguration(config: GenerationConfigurationDto): void {
    // Validar datas
    const startDate = new Date(config.periodStartDate);
    const endDate = new Date(config.periodEndDate);

    if (startDate > endDate) {
      throw new BadRequestException(
        'periodStartDate must be before or equal to periodEndDate',
      );
    }

    // Validar configuração específica por tipo
    if (config.generationType === 'group' && !config.groupConfig) {
      throw new BadRequestException('groupConfig is required for group generation type');
    }

    if (config.generationType === 'people' && !config.peopleConfig) {
      throw new BadRequestException('peopleConfig is required for people generation type');
    }

    if (
      (config.generationType === 'team_without_restriction' ||
        config.generationType === 'team_with_restriction') &&
      !config.teamConfig
    ) {
      throw new BadRequestException('teamConfig is required for team generation types');
    }
  }

  private async generatePreviewSchedules(
    scheduledAreaId: string,
    config: GenerationConfigurationDto,
  ): Promise<SchedulePreviewDto[]> {
    // Esta é uma implementação simplificada
    // A lógica completa de geração será implementada em um helper separado
    const schedules: SchedulePreviewDto[] = [];

    // Gerar escalas baseado no tipo de período
    const dates = this.generatePeriodDates(config);

    // Buscar todos os grupos uma vez se for geração por grupos
    let allGroups: any[] = [];
    if (config.generationType === 'group') {
      allGroups = await this.fetchAllGroupsWithMembers(
        scheduledAreaId,
        config.groupConfig!.groupIds,
      );
    }

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const schedule: SchedulePreviewDto = {
        id: `preview-${i + 1}`,
        startDatetime: date.start.toISOString(),
        endDatetime: date.end.toISOString(),
        warnings: [],
        errors: [],
      };

      // Gerar conteúdo baseado no tipo de geração
      if (config.generationType === 'group') {
        schedule.groups = this.selectGroupsForSchedule(
          allGroups,
          config.groupConfig!,
          i,
        );
      } else if (config.generationType === 'people') {
        // Implementar geração por pessoas
      } else if (
        config.generationType === 'team_without_restriction' ||
        config.generationType === 'team_with_restriction'
      ) {
        schedule.team = await this.generateTeamPreview(
          scheduledAreaId,
          config.teamConfig!,
          date.start,
          date.end,
        );
        if (schedule.team) {
          schedule.assignments = await this.generateTeamAssignmentsPreview(
            scheduledAreaId,
            config.teamConfig!,
            date.start,
            date.end,
          );
        }
      }

      schedules.push(schedule);
    }

    return schedules;
  }

  private generatePeriodDates(config: GenerationConfigurationDto): Array<{
    start: Date;
    end: Date;
  }> {
    const dates: Array<{ start: Date; end: Date }> = [];
    const startDate = new Date(config.periodStartDate);
    const endDate = new Date(config.periodEndDate);

    if (config.periodType === 'fixed') {
      // Uma única escala
      const baseDateTime = config.periodConfig?.baseDateTime
        ? new Date(config.periodConfig.baseDateTime)
        : startDate;
      const duration = config.periodConfig?.duration || 1; // em horas
      const scheduleEnd = new Date(baseDateTime);
      scheduleEnd.setHours(scheduleEnd.getHours() + duration);

      dates.push({ start: baseDateTime, end: scheduleEnd });
    } else if (config.periodType === 'daily') {
      // Escalas diárias
      const weekdays = config.periodConfig?.weekdays || [1, 2, 3, 4, 5];
      const startTime = config.periodConfig?.startTime || '08:00';
      const endTime = config.periodConfig?.endTime || '17:00';
      const excludedDates = (config.periodConfig?.excludedDates || []).map(
        (d) => new Date(d),
      );
      const includedDates = (config.periodConfig?.includedDates || []).map(
        (d) => new Date(d),
      );

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];
        const isIncluded = includedDates.some(
          (d) => d.toISOString().split('T')[0] === dateStr,
        );
        const isExcluded = excludedDates.some(
          (d) => d.toISOString().split('T')[0] === dateStr,
        );

        if ((weekdays.includes(dayOfWeek) || isIncluded) && !isExcluded) {
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);

          const scheduleStart = new Date(currentDate);
          scheduleStart.setHours(startHour, startMinute, 0, 0);

          const scheduleEnd = new Date(currentDate);
          scheduleEnd.setHours(endHour, endMinute, 0, 0);

          dates.push({ start: scheduleStart, end: scheduleEnd });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (config.periodType === 'weekly') {
      // Escalas semanais
      const baseDateTime = config.periodConfig?.baseDateTime
        ? new Date(config.periodConfig.baseDateTime)
        : startDate;
      const duration = config.periodConfig?.duration || 7; // em dias
      const interval = config.periodConfig?.interval || 7; // em dias

      let currentDate = new Date(baseDateTime);
      while (currentDate <= endDate) {
        const scheduleEnd = new Date(currentDate);
        scheduleEnd.setDate(scheduleEnd.getDate() + duration);

        dates.push({ start: new Date(currentDate), end: scheduleEnd });

        currentDate.setDate(currentDate.getDate() + interval);
      }
    } else if (config.periodType === 'monthly') {
      // Escalas mensais
      const baseDateTime = config.periodConfig?.baseDateTime
        ? new Date(config.periodConfig.baseDateTime)
        : startDate;
      const duration = config.periodConfig?.duration || 1; // em dias

      let currentDate = new Date(baseDateTime);
      while (currentDate <= endDate) {
        const scheduleEnd = new Date(currentDate);
        scheduleEnd.setDate(scheduleEnd.getDate() + duration);

        dates.push({ start: new Date(currentDate), end: scheduleEnd });

        // Próximo mês
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return dates;
  }

  /**
   * Busca todos os grupos com seus membros (usado uma vez para todas as escalas)
   */
  private async fetchAllGroupsWithMembers(
    scheduledAreaId: string,
    groupIds: string[],
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar grupos com seus membros e responsabilidades
    const { data: groups } = await supabaseClient
      .from('area_groups')
      .select(
        `
        id,
        name,
        members:area_group_members(
          id,
          person:persons(id, full_name, email, photo_url),
          responsibilities:area_group_member_responsibilities(
            responsibility:responsibilities(id, name, description, image_url)
          )
        )
      `,
      )
      .in('id', groupIds)
      .eq('scheduled_area_id', scheduledAreaId);

    if (!groups || groups.length === 0) {
      return [];
    }

    // Mapear grupos com seus membros
    return groups.map((g: any) => {
      const group: any = {
        id: g.id,
        name: g.name,
        members: [],
      };

      // Processar membros do grupo
      if (g.members && Array.isArray(g.members)) {
        group.members = g.members.map((member: any) => {
          const memberData: any = {
            personId: member.person?.id || '',
            personName: member.person?.full_name || '',
            personPhotoUrl: member.person?.photo_url || null,
            responsibilities: [],
          };

          // Processar responsabilidades do membro
          if (member.responsibilities && Array.isArray(member.responsibilities)) {
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

      return group;
    });
  }

  /**
   * Seleciona os grupos para uma escala específica baseado na configuração de distribuição
   */
  private selectGroupsForSchedule(
    allGroups: any[],
    groupConfig: any,
    scheduleIndex: number,
  ): any[] {
    if (!allGroups || allGroups.length === 0) {
      return [];
    }

    const groupsPerSchedule = groupConfig.groupsPerSchedule || 1;
    const distributionOrder = groupConfig.distributionOrder || 'sequential';

    let selectedGroups: any[] = [];

    if (distributionOrder === 'sequential') {
      // Distribuição sequencial: cicla pelos grupos de forma sequencial
      // Exemplo: 3 grupos, 1 por escala -> escala 0: grupo 0, escala 1: grupo 1, escala 2: grupo 2, escala 3: grupo 0...
      const startIndex = scheduleIndex % allGroups.length;
      for (let i = 0; i < groupsPerSchedule; i++) {
        const index = (startIndex + i) % allGroups.length;
        selectedGroups.push(allGroups[index]);
      }
    } else if (distributionOrder === 'random') {
      // Distribuição aleatória: seleciona grupos aleatórios
      // Usa o índice da escala como seed para manter consistência no preview
      const shuffled = [...allGroups].sort(() => Math.random() - 0.5);
      selectedGroups = shuffled.slice(0, groupsPerSchedule);
    } else if (distributionOrder === 'balanced') {
      // Distribuição balanceada: distribui os grupos de forma equilibrada
      // Para gruposPerSchedule = 1, distribui sequencialmente mas de forma balanceada
      // Exemplo: 3 grupos, 1 por escala -> escala 0: grupo 0, escala 1: grupo 1, escala 2: grupo 2, escala 3: grupo 0...
      // Isso é similar ao sequential quando groupsPerSchedule = 1
      if (groupsPerSchedule === 1) {
        const index = scheduleIndex % allGroups.length;
        selectedGroups.push(allGroups[index]);
      } else {
        // Para múltiplos grupos por escala, distribui de forma balanceada
        const totalGroups = allGroups.length;
        const cycles = Math.floor(scheduleIndex / Math.ceil(totalGroups / groupsPerSchedule));
        const positionInCycle = scheduleIndex % Math.ceil(totalGroups / groupsPerSchedule);
        const startIndex = (positionInCycle * groupsPerSchedule) % totalGroups;
        
        for (let i = 0; i < groupsPerSchedule; i++) {
          const index = (startIndex + i) % totalGroups;
          selectedGroups.push(allGroups[index]);
        }
      }
    } else {
      // Fallback para sequential
      const startIndex = scheduleIndex % allGroups.length;
      for (let i = 0; i < groupsPerSchedule; i++) {
        const index = (startIndex + i) % allGroups.length;
        selectedGroups.push(allGroups[index]);
      }
    }

    return selectedGroups;
  }

  private async generateTeamPreview(
    scheduledAreaId: string,
    teamConfig: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data: team } = await supabaseClient
      .from('area_teams')
      .select('id, name')
      .eq('id', teamConfig.teamId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    return team
      ? {
          id: team.id,
          name: team.name,
        }
      : null;
  }

  private async generateTeamAssignmentsPreview(
    scheduledAreaId: string,
    teamConfig: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    // Implementação simplificada
    // A lógica completa de atribuição será implementada depois
    return [];
  }

  private calculateSummary(schedules: SchedulePreviewDto[]): GenerationSummaryDto {
    const totalSchedules = schedules.length;
    const totalWarnings = schedules.reduce((sum, s) => sum + s.warnings.length, 0);
    const totalErrors = schedules.reduce((sum, s) => sum + s.errors.length, 0);

    // Calcular participantes únicos (simplificado)
    const participantIds = new Set<string>();
    schedules.forEach((schedule) => {
      if (schedule.groups) {
        schedule.groups.forEach((group) => {
          if (group.members) {
            group.members.forEach((member) => {
              participantIds.add(member.personId);
            });
          }
        });
      }
      if (schedule.assignments) {
        schedule.assignments.forEach((assignment) => {
          if (assignment.personId) {
            participantIds.add(assignment.personId);
          }
        });
      }
    });

    // Determinar balanceamento
    let distributionBalance: 'balanced' | 'unbalanced' | 'critical' = 'balanced';
    if (totalErrors > 0) {
      distributionBalance = 'critical';
    } else if (totalWarnings > totalSchedules * 0.3) {
      distributionBalance = 'unbalanced';
    }

    return {
      totalSchedules,
      totalParticipants: participantIds.size,
      warnings: totalWarnings,
      errors: totalErrors,
      distributionBalance,
    };
  }

  private async createSchedulesFromGeneration(
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
        .from('schedules')
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
        // Log do erro para debug
        console.error('Error creating schedule:', scheduleError);
        handleSupabaseError(scheduleError);
      }

      // Criar relacionamentos baseado no tipo
      if (preview.groups && preview.groups.length > 0) {
        // Validar que todos os grupos ainda existem antes de inserir
        const groupIds = preview.groups.map((g) => g.id);
        const { data: existingGroups, error: checkError } = await supabaseClient
          .from('area_groups')
          .select('id')
          .in('id', groupIds)
          .eq('scheduled_area_id', scheduledAreaId);

        if (checkError || !existingGroups || existingGroups.length !== groupIds.length) {
          throw new BadRequestException(
            'One or more groups do not exist or do not belong to this scheduled area',
          );
        }

        const { error: groupsError } = await supabaseClient
          .from('schedule_groups')
          .insert(
            preview.groups.map((g) => ({
              schedule_id: schedule.id,
              group_id: g.id,
            })),
          );

        if (groupsError) {
          // Log do erro para debug
          console.error('Error creating schedule_groups:', groupsError);
          console.error('Schedule ID:', schedule.id);
          console.error('Group IDs:', preview.groups.map((g) => g.id));
          handleSupabaseError(groupsError);
        }
      }

      if (preview.team) {
        const { error: teamError } = await supabaseClient
          .from('schedule_teams')
          .insert({
            schedule_id: schedule.id,
            team_id: preview.team.id,
          });

        if (teamError) {
          handleSupabaseError(teamError);
        }
      }

      if (preview.assignments && preview.assignments.length > 0) {
        const { error: assignmentsError } = await supabaseClient
          .from('schedule_team_assignments')
          .insert(
            preview.assignments
              .filter((a) => a.personId)
              .map((a) => ({
                schedule_id: schedule.id,
                person_id: a.personId,
                team_role_id: a.roleId,
              })),
          );

        if (assignmentsError) {
          handleSupabaseError(assignmentsError);
        }
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

  private mapToResponseDto(data: any): ScheduleGenerationResponseDto {
    return {
      id: data.id,
      scheduledAreaId: data.scheduled_area_id,
      generationType: data.generation_type,
      periodType: data.period_type,
      periodStartDate: data.period_start_date,
      periodEndDate: data.period_end_date,
      configuration: data.configuration,
      totalSchedulesGenerated: data.total_schedules_generated,
      createdAt: data.created_at,
      createdBy: data.created_by,
    };
  }
}

