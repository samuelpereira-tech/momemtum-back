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

    // Criar as escalas reaproveitando os dados do preview
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

    // Reaproveitar os dados do preview para construir a resposta final
    // Isso evita buscar novamente do banco os dados que já temos processados
    // Buscar apenas os IDs dos assignments criados para completar os dados
    const scheduleIds = createdSchedules.map((s) => s.id);
    const assignmentsMap = await this.getAssignmentsMap(scheduleIds);

    const schedulesWithDetails = this.mapPreviewToScheduleDetails(
      preview.schedules,
      createdSchedules,
      assignmentsMap,
    );

    const response = this.mapToResponseDto(generation);
    return {
      ...response,
      schedules: schedulesWithDetails,
    };
  }

  /**
   * Busca todas as escalas de uma geração com detalhes completos (OTIMIZADO)
   * Usa uma única query com relacionamentos aninhados
   */
  private async getSchedulesWithDetails(
    generationId: string,
    scheduledAreaId: string,
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar todas as escalas com todos os relacionamentos em uma única query
    const { data: schedules, error } = await supabaseClient
      .from('schedules')
      .select(
        `
        *,
        groups:schedule_groups(
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
        ),
        team:schedule_teams(
          team_id,
          area_teams(id, name)
        ),
        assignments:schedule_team_assignments(
          id,
          person_id,
          team_role_id,
          persons(id, full_name, email, photo_url),
          area_team_roles(
            id,
            responsibility_id,
            quantity,
            priority,
            is_free,
            responsibilities(id, name, image_url)
          )
        )
      `,
      )
      .eq('schedule_generation_id', generationId)
      .eq('scheduled_area_id', scheduledAreaId)
      .order('start_datetime', { ascending: true });

    if (error || !schedules) {
      return [];
    }

    // Processar os dados
    return schedules.map((schedule: any) => this.processScheduleData(schedule));
  }

  /**
   * Processa os dados de uma escala retornados pela query otimizada
   */
  private processScheduleData(schedule: any): any {
    // Processar grupos com membros
    const processedGroups = ((schedule.groups || []) as any[]).map((g: any) => {
      const groupData: any = {
        id: g.area_groups?.id || '',
        name: g.area_groups?.name || '',
        members: [],
      };

      // Processar membros do grupo
      if (
        g.area_groups?.members &&
        Array.isArray(g.area_groups.members)
      ) {
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

    // Processar equipe
    const teamData =
      schedule.team && Array.isArray(schedule.team) && schedule.team.length > 0
        ? schedule.team[0]
        : schedule.team;
    const processedTeam =
      teamData?.area_teams
        ? {
            id: teamData.area_teams.id,
            name: teamData.area_teams.name,
          }
        : null;

    // Processar atribuições
    const processedAssignments = ((schedule.assignments || []) as any[]).map(
      (a: any) => ({
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
      }),
    );

    return {
      id: schedule.id,
      scheduleGenerationId: schedule.schedule_generation_id,
      scheduledAreaId: schedule.scheduled_area_id,
      startDatetime: schedule.start_datetime,
      endDatetime: schedule.end_datetime,
      scheduleType: schedule.schedule_type,
      status: schedule.status,
      groups: processedGroups,
      team: processedTeam,
      assignments: processedAssignments,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    };
  }

  /**
   * Busca os assignments criados para completar os dados
   */
  private async getAssignmentsMap(
    scheduleIds: string[],
  ): Promise<Map<string, any[]>> {
    if (scheduleIds.length === 0) {
      return new Map();
    }

    const supabaseClient = this.supabaseService.getRawClient();
    const { data: assignments } = await supabaseClient
      .from('schedule_team_assignments')
      .select(
        'id, schedule_id, person_id, team_role_id, persons(id, full_name, email, photo_url), area_team_roles(id, responsibility_id, responsibilities(id, name, image_url))',
      )
      .in('schedule_id', scheduleIds);

    if (!assignments) {
      return new Map();
    }

    // Agrupar por schedule_id
    const assignmentsMap = new Map<string, any[]>();
    assignments.forEach((a: any) => {
      const scheduleId = a.schedule_id;
      if (!assignmentsMap.has(scheduleId)) {
        assignmentsMap.set(scheduleId, []);
      }
      assignmentsMap.get(scheduleId)!.push(a);
    });

    return assignmentsMap;
  }

  /**
   * Mapeia os dados do preview para o formato de detalhes de schedule
   * Reaproveita os dados já processados do preview, evitando nova busca no banco
   */
  private mapPreviewToScheduleDetails(
    previewSchedules: SchedulePreviewDto[],
    createdSchedules: any[],
    assignmentsMap: Map<string, any[]>,
  ): any[] {
    // Normalizar datas para comparação
    const normalizeDateTime = (dt: string) => {
      const date = new Date(dt);
      return date.toISOString();
    };

    // Criar mapa de schedules criadas por start_datetime
    const scheduleMap = new Map<string, any>();
    createdSchedules.forEach((s) => {
      const normalizedKey = normalizeDateTime(s.start_datetime);
      scheduleMap.set(normalizedKey, s);
    });

    // Mapear preview para formato de detalhes
    return previewSchedules
      .map((preview) => {
        const normalizedKey = normalizeDateTime(preview.startDatetime);
        const createdSchedule = scheduleMap.get(normalizedKey);

        if (!createdSchedule) {
          return null;
        }

        // Converter grupos do preview para o formato de detalhes
        const groups = (preview.groups || []).map((g) => ({
          id: g.id,
          name: g.name,
          members: (g.members || []).map((m) => ({
            personId: m.personId,
            personName: m.personName,
            personPhotoUrl: m.personPhotoUrl,
            responsibilities: (m.responsibilities || []).map((r) => ({
              id: r.id,
              name: r.name,
              imageUrl: r.imageUrl,
            })),
          })),
        }));

        // Converter team do preview
        const team = preview.team
          ? {
              id: preview.team.id,
              name: preview.team.name,
            }
          : null;

        // Converter assignments - usar dados do banco se disponível, senão usar preview
        const createdAssignments = assignmentsMap.get(createdSchedule.id) || [];
        const assignments = createdAssignments.length > 0
          ? createdAssignments.map((a: any) => ({
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
            }))
          : (preview.assignments || []).map((a) => ({
              id: '',
              personId: a.personId,
              person: a.personId
                ? {
                    id: a.personId,
                    fullName: a.personName,
                    email: '',
                    photoUrl: null,
                  }
                : null,
              teamRoleId: a.roleId,
              teamRole: a.roleId
                ? {
                    id: a.roleId,
                    responsibilityId: '',
                    responsibility: a.roleName
                      ? {
                          id: '',
                          name: a.roleName,
                          imageUrl: null,
                        }
                      : null,
                  }
                : null,
            }));

        return {
          id: createdSchedule.id,
          scheduleGenerationId: createdSchedule.schedule_generation_id,
          scheduledAreaId: createdSchedule.scheduled_area_id,
          startDatetime: preview.startDatetime,
          endDatetime: preview.endDatetime,
          scheduleType: createdSchedule.schedule_type,
          status: createdSchedule.status || 'pending',
          groups,
          team,
          assignments,
          createdAt: createdSchedule.created_at,
          updatedAt: createdSchedule.updated_at || createdSchedule.created_at,
        };
      })
      .filter((s) => s !== null);
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

    // Enriquecer configurações com nomes dos grupos (otimizado - busca todos os grupos de uma vez)
    const enrichedData = await this.enrichConfigurationsWithGroupNames(
      data,
      scheduledAreaId,
    );

    return {
      data: enrichedData.map((item: any) => this.mapToResponseDto(item)),
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

    // Enriquecer configuração com nomes dos grupos
    const enrichedData = await this.enrichConfigurationWithGroupNames(data);

    return this.mapToResponseDto(enrichedData);
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
            i, // scheduleIndex para rotação
            schedules, // schedules anteriores para histórico
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
    scheduleIndex: number = 0,
    previousSchedules: SchedulePreviewDto[] = [],
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();
    const assignments: any[] = [];

    // 1. Buscar roles da equipe ordenadas por prioridade
    const { data: teamRoles, error: rolesError } = await supabaseClient
      .from('area_team_roles')
      .select('id, responsibility_id, quantity, priority, is_free, responsibility:responsibilities(id, name, image_url)')
      .eq('team_id', teamConfig.teamId)
      .order('priority', { ascending: true });

    if (rolesError || !teamRoles || teamRoles.length === 0) {
      return [];
    }

    // 2. Buscar pessoas fixas atribuídas a roles
    const roleIds = teamRoles.map((r: any) => r.id);
    const { data: fixedPersons } = await supabaseClient
      .from('area_team_role_fixed_persons')
      .select('team_role_id, person_id')
      .in('team_role_id', roleIds);

    const fixedPersonsMap = new Map<string, string[]>();
    if (fixedPersons) {
      fixedPersons.forEach((fp: any) => {
        const current = fixedPersonsMap.get(fp.team_role_id) || [];
        current.push(fp.person_id);
        fixedPersonsMap.set(fp.team_role_id, current);
      });
    }

    // 3. Buscar participantes baseado na configuração
    let participants: any[] = [];
    
    if (teamConfig.participantSelection === 'all') {
      // Buscar todas as pessoas da área
      const { data: personAreas, error: personAreasError } = await supabaseClient
        .from('person_areas')
        .select('person_id, person:persons(id, full_name, email, photo_url)')
        .eq('scheduled_area_id', scheduledAreaId);

      if (personAreasError) {
        console.error('Error fetching person_areas:', personAreasError);
      }

      if (personAreas) {
        participants = personAreas.map((pa: any) => ({
          personId: pa.person_id,
          person: pa.person,
        }));
      }
    } else if (teamConfig.participantSelection === 'by_group' && teamConfig.selectedGroupIds?.length > 0) {
      // Buscar pessoas dos grupos selecionados
      const { data: groupMembers, error: groupMembersError } = await supabaseClient
        .from('area_group_members')
        .select('person_id, persons(id, full_name, email, photo_url)')
        .in('group_id', teamConfig.selectedGroupIds);

      if (groupMembersError) {
        console.error('Error fetching area_group_members:', groupMembersError);
      }

      if (groupMembers) {
        const personMap = new Map();
        groupMembers.forEach((gm: any) => {
          if (!personMap.has(gm.person_id)) {
            personMap.set(gm.person_id, {
              personId: gm.person_id,
              person: gm.persons, // Mudança: usar 'persons' em vez de 'person'
            });
          }
        });
        participants = Array.from(personMap.values());
      }
    } else if (teamConfig.participantSelection === 'individual' && teamConfig.selectedPersonIds?.length > 0) {
      // Buscar pessoas selecionadas individualmente
      const { data: persons, error: personsError } = await supabaseClient
        .from('persons')
        .select('id, full_name, email, photo_url')
        .in('id', teamConfig.selectedPersonIds);

      if (personsError) {
        console.error('Error fetching persons:', personsError);
      }

      if (persons) {
        participants = persons.map((p: any) => ({
          personId: p.id,
          person: p,
        }));
      }
    } else if (teamConfig.participantSelection === 'all_with_exclusions') {
      // Buscar todas as pessoas da área
      const { data: personAreas, error: personAreasError } = await supabaseClient
        .from('person_areas')
        .select('person_id, person:persons(id, full_name, email, photo_url)')
        .eq('scheduled_area_id', scheduledAreaId);

      if (personAreasError) {
        console.error('Error fetching person_areas:', personAreasError);
      }

      if (personAreas) {
        const excludedSet = new Set(teamConfig.excludedPersonIds || []);
        participants = personAreas
          .filter((pa: any) => !excludedSet.has(pa.person_id))
          .map((pa: any) => ({
            personId: pa.person_id,
            person: pa.person,
          }));
      }
    }

    // 4. Filtrar por ausências se necessário
    if (teamConfig.considerAbsences && participants.length > 0) {
      const participantIds = participants.map((p: any) => p.personId);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: absences } = await supabaseClient
        .from('scheduled_absences')
        .select('person_id')
        .in('person_id', participantIds)
        .lte('start_date', endDateStr)
        .gte('end_date', startDateStr);

      const absentPersonIds = new Set((absences || []).map((a: any) => a.person_id));
      participants = participants.filter((p: any) => !absentPersonIds.has(p.personId));
    }

    // 5. Buscar responsabilidades dos participantes se necessário
    const participantResponsibilitiesMap = new Map<string, string[]>();
    if (teamConfig.requireResponsibilities && participants.length > 0) {
      const participantIds = participants.map((p: any) => p.personId);
      
      // Buscar person_areas primeiro para obter os IDs
      const { data: personAreaData, error: personAreaError } = await supabaseClient
        .from('person_areas')
        .select('id, person_id')
        .eq('scheduled_area_id', scheduledAreaId)
        .in('person_id', participantIds);

      if (personAreaError) {
        console.error('Error fetching person_areas for responsibilities:', personAreaError);
      }

      if (personAreaData && personAreaData.length > 0) {
        const personAreaIds = personAreaData.map((pa: any) => pa.id);
        const personIdToPersonAreaId = new Map<string, string>();
        personAreaData.forEach((pa: any) => {
          personIdToPersonAreaId.set(pa.person_id, pa.id);
        });

        // Buscar responsabilidades usando person_area_id
        const { data: responsibilitiesData, error: responsibilitiesError } = await supabaseClient
          .from('person_area_responsibilities')
          .select('person_area_id, responsibility_id')
          .in('person_area_id', personAreaIds);

        if (responsibilitiesError) {
          console.error('Error fetching person_area_responsibilities:', responsibilitiesError);
        }

        if (responsibilitiesData) {
          // Agrupar responsabilidades por person_id
          responsibilitiesData.forEach((r: any) => {
            const personAreaId = r.person_area_id;
            // Encontrar person_id correspondente
            for (const [personId, paId] of personIdToPersonAreaId.entries()) {
              if (paId === personAreaId) {
                const current = participantResponsibilitiesMap.get(personId) || [];
                current.push(r.responsibility_id);
                participantResponsibilitiesMap.set(personId, current);
                break;
              }
            }
          });
        }
      }
    }

    // 6. Construir histórico de atribuições anteriores para balanceamento
    const assignmentHistory = new Map<string, Map<string, number>>(); // Map<roleId, Map<personId, count>>
    
    // Inicializar histórico para todos os roles
    teamRoles.forEach((role: any) => {
      assignmentHistory.set(role.id, new Map<string, number>());
    });

    // Contar atribuições anteriores
    previousSchedules.forEach((prevSchedule: any) => {
      if (prevSchedule.assignments && Array.isArray(prevSchedule.assignments)) {
        prevSchedule.assignments.forEach((assignment: any) => {
          if (assignment.personId && assignment.roleId) {
            const roleHistory = assignmentHistory.get(assignment.roleId);
            if (roleHistory) {
              const currentCount = roleHistory.get(assignment.personId) || 0;
              roleHistory.set(assignment.personId, currentCount + 1);
            }
          }
        });
      }
    });

    // 7. Atribuir pessoas aos roles com rotação balanceada
    const usedPersonIds = new Set<string>();
    const availableParticipants = [...participants];

    for (const role of teamRoles) {
      const roleId = role.id;
      const responsibilityId = role.responsibility_id;
      const quantity = role.quantity || 1;
      const fixedPersonIds = fixedPersonsMap.get(roleId) || [];
      const roleHistory = assignmentHistory.get(roleId) || new Map<string, number>();

      // Primeiro, atribuir pessoas fixas
      for (const fixedPersonId of fixedPersonIds) {
        if (quantity > 0) {
          const fixedPerson = participants.find((p: any) => p.personId === fixedPersonId);
          if (fixedPerson) {
            const responsibility = Array.isArray(role.responsibility) ? role.responsibility[0] : role.responsibility;
            assignments.push({
              personId: fixedPersonId,
              personName: fixedPerson.person?.full_name || '[Não atribuído]',
              roleId: roleId,
              roleName: responsibility?.name || '[Sem nome]',
            });
            usedPersonIds.add(fixedPersonId);
            // Não decrementar quantity para pessoas fixas, elas são adicionais
          }
        }
      }

      // Depois, preencher as vagas restantes com rotação balanceada
      let assignedCount = fixedPersonIds.length;
      
      // Filtrar participantes elegíveis para este role
      const eligibleParticipants = availableParticipants.filter((p: any) => {
        if (usedPersonIds.has(p.personId)) return false;
        if (teamConfig.requireResponsibilities) {
          const personResponsibilities = participantResponsibilitiesMap.get(p.personId) || [];
          return personResponsibilities.includes(responsibilityId);
        }
        return true;
      });

      // Ordenar por histórico de atribuições (menos atribuições primeiro)
      // Em caso de empate, usar rotação baseada no scheduleIndex
      // Primeiro, criar um mapa de índices originais para rotação estável
      const originalIndices = new Map<string, number>();
      eligibleParticipants.forEach((p: any, index: number) => {
        originalIndices.set(p.personId, index);
      });

      eligibleParticipants.sort((a: any, b: any) => {
        const countA = roleHistory.get(a.personId) || 0;
        const countB = roleHistory.get(b.personId) || 0;
        if (countA !== countB) {
          return countA - countB; // Menor contagem primeiro
        }
        // Em caso de empate, usar rotação baseada no scheduleIndex
        const indexA = originalIndices.get(a.personId) || 0;
        const indexB = originalIndices.get(b.personId) || 0;
        const rotatedIndexA = (indexA + scheduleIndex) % eligibleParticipants.length;
        const rotatedIndexB = (indexB + scheduleIndex) % eligibleParticipants.length;
        return rotatedIndexA - rotatedIndexB;
      });

      // Atribuir pessoas ordenadas
      for (const participant of eligibleParticipants) {
        if (assignedCount >= quantity) break;

        const responsibility = Array.isArray(role.responsibility) ? role.responsibility[0] : role.responsibility;

        assignments.push({
          personId: participant.personId,
          personName: participant.person?.full_name || '[Não atribuído]',
          roleId: roleId,
          roleName: responsibility?.name || '[Sem nome]',
        });
        usedPersonIds.add(participant.personId);
        assignedCount++;
      }

      // Se não há pessoas suficientes e repeatPersonsWhenInsufficient está habilitado
      if (assignedCount < quantity && teamConfig.repeatPersonsWhenInsufficient) {
        // Reutilizar pessoas já atribuídas, mas com rotação
        const reusableParticipants = eligibleParticipants.length > 0 
          ? eligibleParticipants 
          : availableParticipants.filter((p: any) => {
              if (teamConfig.requireResponsibilities) {
                const personResponsibilities = participantResponsibilitiesMap.get(p.personId) || [];
                return personResponsibilities.includes(responsibilityId);
              }
              return true;
            });

        if (reusableParticipants.length > 0) {
          // Ordenar por histórico também para reutilização
          const reusableOriginalIndices = new Map<string, number>();
          reusableParticipants.forEach((p: any, index: number) => {
            reusableOriginalIndices.set(p.personId, index);
          });

          reusableParticipants.sort((a: any, b: any) => {
            const countA = roleHistory.get(a.personId) || 0;
            const countB = roleHistory.get(b.personId) || 0;
            if (countA !== countB) {
              return countA - countB;
            }
            const indexA = reusableOriginalIndices.get(a.personId) || 0;
            const indexB = reusableOriginalIndices.get(b.personId) || 0;
            const rotatedIndexA = (indexA + scheduleIndex) % reusableParticipants.length;
            const rotatedIndexB = (indexB + scheduleIndex) % reusableParticipants.length;
            return rotatedIndexA - rotatedIndexB;
          });

          let reuseIndex = 0;
          while (assignedCount < quantity && reusableParticipants.length > 0) {
            const participant = reusableParticipants[reuseIndex % reusableParticipants.length];
            const responsibility = Array.isArray(role.responsibility) ? role.responsibility[0] : role.responsibility;
            assignments.push({
              personId: participant.personId,
              personName: participant.person?.full_name || '[Não atribuído]',
              roleId: roleId,
              roleName: responsibility?.name || '[Sem nome]',
            });
            assignedCount++;
            reuseIndex++;
          }
        }
      }

      // Se ainda faltam vagas, adicionar placeholders
      while (assignedCount < quantity) {
        const responsibility = Array.isArray(role.responsibility) ? role.responsibility[0] : role.responsibility;
        assignments.push({
          personId: '',
          personName: '[Não atribuído]',
          roleId: roleId,
          roleName: responsibility?.name || '[Sem nome]',
        });
        assignedCount++;
      }
    }

    return assignments;
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

  /**
   * Cria todas as escalas de uma geração de forma otimizada (batch inserts)
   */
  private async createSchedulesFromGeneration(
    generationId: string,
    scheduledAreaId: string,
    previewSchedules: SchedulePreviewDto[],
    config: GenerationConfigurationDto,
  ): Promise<any[]> {
    const supabaseClient = this.supabaseService.getRawClient();
    const scheduleType = this.determineScheduleType(config);

    // 1. Batch insert de todas as schedules de uma vez
    const schedulesToInsert = previewSchedules.map((preview) => ({
      schedule_generation_id: generationId,
      scheduled_area_id: scheduledAreaId,
      start_datetime: preview.startDatetime,
      end_datetime: preview.endDatetime,
      schedule_type: scheduleType,
      status: 'pending',
    }));

    const { data: createdSchedules, error: schedulesError } = await supabaseClient
      .from('schedules')
      .insert(schedulesToInsert)
      .select('id, start_datetime');

    if (schedulesError) {
      console.error('Error creating schedules:', schedulesError);
      handleSupabaseError(schedulesError);
    }

    if (!createdSchedules || createdSchedules.length === 0) {
      return [];
    }

    // Verificar se todas as schedules foram criadas
    if (createdSchedules.length !== previewSchedules.length) {
      throw new BadRequestException(
        `Expected ${previewSchedules.length} schedules but only ${createdSchedules.length} were created`,
      );
    }

    // Ordenar schedules criadas pela mesma ordem do preview (por start_datetime)
    // Normalizar datas para comparação (remover milissegundos se necessário)
    const normalizeDateTime = (dt: string) => {
      const date = new Date(dt);
      return date.toISOString();
    };

    const scheduleMap = new Map<string, any>();
    createdSchedules.forEach((s) => {
      const normalizedKey = normalizeDateTime(s.start_datetime);
      scheduleMap.set(normalizedKey, s);
    });

    // Manter a ordem do preview e validar que todas as schedules foram encontradas
    const sortedSchedules: any[] = [];
    for (const preview of previewSchedules) {
      const normalizedKey = normalizeDateTime(preview.startDatetime);
      const schedule = scheduleMap.get(normalizedKey);
      if (!schedule) {
        throw new BadRequestException(
          `Could not find created schedule for preview with startDatetime: ${preview.startDatetime}`,
        );
      }
      sortedSchedules.push(schedule);
    }

    // 2. Preparar todos os relacionamentos para batch insert
    const scheduleGroupsToInsert: Array<{
      schedule_id: string;
      group_id: string;
    }> = [];
    const scheduleTeamsToInsert: Array<{
      schedule_id: string;
      team_id: string;
    }> = [];
    const scheduleAssignmentsToInsert: Array<{
      schedule_id: string;
      person_id: string;
      team_role_id: string;
    }> = [];
    const scheduleMembersToInsert: Array<{
      schedule_id: string;
      person_id: string;
      responsibility_id: string;
    }> = [];

    // Validar grupos uma única vez se necessário
    const allGroupIds = new Set<string>();
    previewSchedules.forEach((preview) => {
      if (preview.groups) {
        preview.groups.forEach((g) => allGroupIds.add(g.id));
      }
    });

    if (allGroupIds.size > 0) {
      const { data: existingGroups, error: checkError } = await supabaseClient
        .from('area_groups')
        .select('id')
        .in('id', Array.from(allGroupIds))
        .eq('scheduled_area_id', scheduledAreaId);

      if (checkError || !existingGroups) {
        throw new BadRequestException(
          'Error validating groups: ' + (checkError?.message || 'Unknown error'),
        );
      }

      const existingGroupIds = new Set(
        existingGroups.map((g: any) => g.id),
      );
      const missingGroups = Array.from(allGroupIds).filter(
        (id) => !existingGroupIds.has(id),
      );

      if (missingGroups.length > 0) {
        throw new BadRequestException(
          `One or more groups do not exist or do not belong to this scheduled area: ${missingGroups.join(', ')}`,
        );
      }
    }

    // Preparar relacionamentos
    for (let i = 0; i < previewSchedules.length; i++) {
      const preview = previewSchedules[i];
      const schedule = sortedSchedules[i];

      // Validação de segurança
      if (!schedule || !schedule.id) {
        throw new BadRequestException(
          `Invalid schedule at index ${i}: schedule is undefined or missing id`,
        );
      }

      if (preview.groups && preview.groups.length > 0) {
        preview.groups.forEach((g) => {
          if (!g || !g.id) {
            throw new BadRequestException(
              `Invalid group in preview at index ${i}: group is undefined or missing id`,
            );
          }
          scheduleGroupsToInsert.push({
            schedule_id: schedule.id,
            group_id: g.id,
          });

          // Criar schedule_members para cada membro do grupo
          // Nota: A constraint UNIQUE(schedule_id, person_id) permite apenas um membro por pessoa por schedule
          // Usaremos a primeira responsabilidade do membro
          if (g.members && Array.isArray(g.members)) {
            g.members.forEach((member) => {
              if (member.personId && member.responsibilities && member.responsibilities.length > 0) {
                // Verificar se a pessoa já foi adicionada para esta schedule (evitar duplicatas)
                const alreadyAdded = scheduleMembersToInsert.some(
                  (sm) =>
                    sm.schedule_id === schedule.id &&
                    sm.person_id === member.personId,
                );

                if (!alreadyAdded) {
                  // Usar a primeira responsabilidade do membro
                  const firstResponsibility = member.responsibilities[0];
                  if (firstResponsibility && firstResponsibility.id) {
                    scheduleMembersToInsert.push({
                      schedule_id: schedule.id,
                      person_id: member.personId,
                      responsibility_id: firstResponsibility.id,
                    });
                  }
                }
              }
            });
          }
        });
      }

      if (preview.team) {
        if (!preview.team.id) {
          throw new BadRequestException(
            `Invalid team in preview at index ${i}: team is missing id`,
          );
        }
        scheduleTeamsToInsert.push({
          schedule_id: schedule.id,
          team_id: preview.team.id,
        });
      }

      if (preview.assignments && preview.assignments.length > 0) {
        preview.assignments
          .filter((a) => a && a.personId && a.roleId)
          .forEach((a) => {
            scheduleAssignmentsToInsert.push({
              schedule_id: schedule.id,
              person_id: a.personId,
              team_role_id: a.roleId,
            });
          });
      }
    }

    // 3. Batch insert de todos os relacionamentos
    if (scheduleGroupsToInsert.length > 0) {
      const { error: groupsError } = await supabaseClient
        .from('schedule_groups')
        .insert(scheduleGroupsToInsert);

      if (groupsError) {
        console.error('Error creating schedule_groups:', groupsError);
        handleSupabaseError(groupsError);
      }
    }

    if (scheduleTeamsToInsert.length > 0) {
      const { error: teamError } = await supabaseClient
        .from('schedule_teams')
        .insert(scheduleTeamsToInsert);

      if (teamError) {
        console.error('Error creating schedule_teams:', teamError);
        handleSupabaseError(teamError);
      }
    }

    if (scheduleAssignmentsToInsert.length > 0) {
      const { error: assignmentsError } = await supabaseClient
        .from('schedule_team_assignments')
        .insert(scheduleAssignmentsToInsert);

      if (assignmentsError) {
        console.error('Error creating schedule_team_assignments:', assignmentsError);
        handleSupabaseError(assignmentsError);
      }
    }

    // 4. Batch insert de schedule_members (membros dos grupos)
    if (scheduleMembersToInsert.length > 0) {
      const { error: membersError } = await supabaseClient
        .from('schedule_members')
        .insert(scheduleMembersToInsert);

      if (membersError) {
        console.error('Error creating schedule_members:', membersError);
        handleSupabaseError(membersError);
      }
    }

    return sortedSchedules;
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

  /**
   * Enriquece múltiplas configurações com nomes dos grupos (otimizado)
   * Busca todos os grupos únicos de uma vez
   */
  private async enrichConfigurationsWithGroupNames(
    dataArray: any[],
    scheduledAreaId: string,
  ): Promise<any[]> {
    // Coletar todos os groupIds únicos
    const allGroupIds = new Set<string>();
    dataArray.forEach((item) => {
      if (
        item.configuration?.groupConfig?.groupIds &&
        Array.isArray(item.configuration.groupConfig.groupIds)
      ) {
        item.configuration.groupConfig.groupIds.forEach((id: string) => {
          allGroupIds.add(id);
        });
      }
    });

    // Buscar todos os grupos de uma vez
    let groupsMap = new Map<string, string>();
    if (allGroupIds.size > 0) {
      const supabaseClient = this.supabaseService.getRawClient();
      const { data: groups } = await supabaseClient
        .from('area_groups')
        .select('id, name')
        .in('id', Array.from(allGroupIds))
        .eq('scheduled_area_id', scheduledAreaId);

      if (groups && groups.length > 0) {
        groups.forEach((g: any) => {
          groupsMap.set(g.id, g.name);
        });
      }
    }

    // Enriquecer cada configuração
    return dataArray.map((item) => {
      if (!item.configuration) {
        return item;
      }

      const config = item.configuration;
      const enrichedConfig = { ...config };

      if (
        config.groupConfig &&
        config.groupConfig.groupIds &&
        Array.isArray(config.groupConfig.groupIds) &&
        config.groupConfig.groupIds.length > 0
      ) {
        enrichedConfig.groupConfig = {
          ...config.groupConfig,
          groups: config.groupConfig.groupIds.map((groupId: string) => ({
            id: groupId,
            name: groupsMap.get(groupId) || null,
          })),
        };
      }

      return {
        ...item,
        configuration: enrichedConfig,
      };
    });
  }

  /**
   * Enriquece uma única configuração com nomes dos grupos
   */
  private async enrichConfigurationWithGroupNames(
    data: any,
  ): Promise<any> {
    return (
      await this.enrichConfigurationsWithGroupNames([data], data.scheduled_area_id)
    )[0];
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

