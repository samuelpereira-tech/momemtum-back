import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import {
  ScheduleLogResponseDto,
  PaginatedScheduleLogResponseDto,
  ScheduleLogChangeType,
} from '../dto/schedule-log.dto';

@Injectable()
export class ScheduleLogService {
  private readonly tableName = 'schedule_logs';

  constructor(private supabaseService: SupabaseService) {}

  async findAll(
    scheduledAreaId: string,
    scheduleId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      changeType?: ScheduleLogChangeType;
      personId?: string;
      changedBy?: string;
    },
  ): Promise<PaginatedScheduleLogResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    // Verificar se o schedule existe e pertence à área
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (scheduleError || !schedule) {
      throw new NotFoundException('Schedule not found');
    }

    let query = supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('schedule_id', scheduleId);

    if (filters?.changeType) {
      query = query.eq('change_type', filters.changeType);
    }

    if (filters?.personId) {
      query = query.eq('person_id', filters.personId);
    }

    if (filters?.changedBy) {
      query = query.eq('changed_by', filters.changedBy);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    // Buscar informações das pessoas (changed_by)
    const changedByIds = [
      ...new Set(
        (data || [])
          .map((log: any) => log.changed_by)
          .filter((id: string | null) => id !== null),
      ),
    ];

    const personsMap = new Map();
    if (changedByIds.length > 0) {
      const { data: persons } = await supabaseClient
        .from('persons')
        .select('id, full_name, email')
        .in('id', changedByIds);

      if (persons) {
        persons.forEach((person: any) => {
          personsMap.set(person.id, {
            id: person.id,
            fullName: person.full_name,
            email: person.email,
          });
        });
      }
    }

    const logs = (data || []).map((log: any) => {
      const dto = this.mapToResponseDto(log, personsMap);
      // Garantir que message sempre esteja presente, mesmo se for null
      if (dto.message === undefined) {
        dto.message = null;
      }
      return dto;
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: logs,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  private mapToResponseDto(
    log: any,
    personsMap: Map<string, { id: string; fullName: string; email: string }>,
  ): ScheduleLogResponseDto {
    return {
      id: log.id,
      scheduleId: log.schedule_id,
      scheduleMemberId: log.schedule_member_id ?? null,
      personId: log.person_id ?? null,
      changeType: log.change_type as ScheduleLogChangeType,
      oldValue: log.old_value ?? undefined,
      newValue: log.new_value ?? undefined,
      changedBy: log.changed_by ?? null,
      changedByPerson: log.changed_by
        ? personsMap.get(log.changed_by) ?? null
        : null,
      message: log.message ?? null,
      createdAt: log.created_at,
    };
  }
}

