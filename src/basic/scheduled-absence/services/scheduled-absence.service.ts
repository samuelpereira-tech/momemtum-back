import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateScheduledAbsenceDto } from '../dto/create-scheduled-absence.dto';
import { UpdateScheduledAbsenceDto } from '../dto/update-scheduled-absence.dto';
import {
  ScheduledAbsenceResponseDto,
  PaginatedScheduledAbsenceResponseDto,
} from '../dto/scheduled-absence-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';

@Injectable()
export class ScheduledAbsenceService {
  private readonly tableName = 'scheduled_absences';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    createScheduledAbsenceDto: CreateScheduledAbsenceDto,
  ): Promise<ScheduledAbsenceResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Validação de datas
    const startDate = new Date(createScheduledAbsenceDto.startDate);
    const endDate = new Date(createScheduledAbsenceDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    // Verifica se a pessoa existe
    const { data: person } = await supabaseClient
      .from('persons')
      .select('id')
      .eq('id', createScheduledAbsenceDto.personId)
      .single();

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    // Verifica se o tipo de ausência existe e está ativo
    const { data: absenceType } = await supabaseClient
      .from('absence_types')
      .select('id, active')
      .eq('id', createScheduledAbsenceDto.absenceTypeId)
      .single();

    if (!absenceType) {
      throw new NotFoundException('Absence type not found');
    }

    if (!absenceType.active) {
      throw new BadRequestException(
        'Cannot create scheduled absence with inactive absence type',
      );
    }

    // Verifica sobreposição de datas para a mesma pessoa
    await this.checkDateOverlap(
      createScheduledAbsenceDto.personId,
      startDate,
      endDate,
    );

    const insertData: any = {
      person_id: createScheduledAbsenceDto.personId,
      absence_type_id: createScheduledAbsenceDto.absenceTypeId,
      start_date: createScheduledAbsenceDto.startDate,
      end_date: createScheduledAbsenceDto.endDate,
    };

    if (createScheduledAbsenceDto.description) {
      insertData.description = createScheduledAbsenceDto.description;
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    personId?: string,
    personName?: string,
    absenceTypeId?: string,
    startDate?: string,
    endDate?: string,
    dateRange?: string,
  ): Promise<PaginatedScheduledAbsenceResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select(
        '*, person:persons(id, full_name, email), absence_type:absence_types(id, name, color)',
        { count: 'exact' },
      );

    if (personId) {
      query = query.eq('person_id', personId);
    }

    if (personName) {
      // Busca pessoas pelo nome e filtra por seus IDs
      const { data: persons } = await supabaseClient
        .from('persons')
        .select('id')
        .ilike('full_name', `%${personName}%`);

      if (persons && persons.length > 0) {
        const personIds = persons.map((p) => p.id);
        query = query.in('person_id', personIds);
      } else {
        // Se não encontrou nenhuma pessoa, retorna resultado vazio
        return {
          data: [],
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        };
      }
    }

    if (absenceTypeId) {
      query = query.eq('absence_type_id', absenceTypeId);
    }

    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    if (dateRange) {
      // Formato: YYYY-MM-DD,YYYY-MM-DD
      const [rangeStart, rangeEnd] = dateRange.split(',');
      if (rangeStart && rangeEnd) {
        // Retorna ausências que se sobrepõem com o range especificado
        // Uma ausência se sobrepõe se: start_date <= rangeEnd AND end_date >= rangeStart
        query = query
          .lte('start_date', rangeEnd)
          .gte('end_date', rangeStart);
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: data.map((item: any) => this.mapToResponseDto(item)),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    };
  }

  async findOne(id: string): Promise<ScheduledAbsenceResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select(
        '*, person:persons(id, full_name, email), absence_type:absence_types(id, name, color)',
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Scheduled absence not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Scheduled absence not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    id: string,
    updateScheduledAbsenceDto: UpdateScheduledAbsenceDto,
  ): Promise<ScheduledAbsenceResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a ausência existe
    const existing = await this.findOne(id);

    // Validação de datas se fornecidas
    const startDate = updateScheduledAbsenceDto.startDate
      ? new Date(updateScheduledAbsenceDto.startDate)
      : new Date(existing.startDate);
    const endDate = updateScheduledAbsenceDto.endDate
      ? new Date(updateScheduledAbsenceDto.endDate)
      : new Date(existing.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }

    const personId = updateScheduledAbsenceDto.personId || existing.personId;

    // Verifica se a pessoa existe (se estiver sendo atualizada)
    if (updateScheduledAbsenceDto.personId) {
      const { data: person } = await supabaseClient
        .from('persons')
        .select('id')
        .eq('id', updateScheduledAbsenceDto.personId)
        .single();

      if (!person) {
        throw new NotFoundException('Person not found');
      }
    }

    // Verifica se o tipo de ausência existe e está ativo (se estiver sendo atualizado)
    if (updateScheduledAbsenceDto.absenceTypeId) {
      const { data: absenceType } = await supabaseClient
        .from('absence_types')
        .select('id, active')
        .eq('id', updateScheduledAbsenceDto.absenceTypeId)
        .single();

      if (!absenceType) {
        throw new NotFoundException('Absence type not found');
      }

      if (!absenceType.active) {
        throw new BadRequestException(
          'Cannot update scheduled absence with inactive absence type',
        );
      }
    }

    // Verifica sobreposição de datas (excluindo a própria ausência)
    await this.checkDateOverlap(personId, startDate, endDate, id);

    const updateData: any = {};
    if (updateScheduledAbsenceDto.personId !== undefined)
      updateData.person_id = updateScheduledAbsenceDto.personId;
    if (updateScheduledAbsenceDto.absenceTypeId !== undefined)
      updateData.absence_type_id = updateScheduledAbsenceDto.absenceTypeId;
    if (updateScheduledAbsenceDto.startDate !== undefined)
      updateData.start_date = updateScheduledAbsenceDto.startDate;
    if (updateScheduledAbsenceDto.endDate !== undefined)
      updateData.end_date = updateScheduledAbsenceDto.endDate;
    if (updateScheduledAbsenceDto.description !== undefined)
      updateData.description = updateScheduledAbsenceDto.description;

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select(
        '*, person:persons(id, full_name, email), absence_type:absence_types(id, name, color)',
      )
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a ausência existe
    await this.findOne(id);

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async checkDateOverlap(
    personId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    let query = supabaseClient
      .from(this.tableName)
      .select('id, start_date, end_date')
      .eq('person_id', personId)
      .lte('start_date', endDate.toISOString().split('T')[0])
      .gte('end_date', startDate.toISOString().split('T')[0]);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: overlapping } = await query;

    if (overlapping && overlapping.length > 0) {
      throw new ConflictException(
        'Overlapping absence dates for the same person',
      );
    }
  }

  private mapToResponseDto(data: any): ScheduledAbsenceResponseDto {
    const result: ScheduledAbsenceResponseDto = {
      id: data.id,
      personId: data.person_id,
      absenceTypeId: data.absence_type_id,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Adiciona informações da pessoa se disponível
    if (data.person) {
      result.person = {
        id: data.person.id,
        fullName: data.person.full_name,
        email: data.person.email,
      };
    }

    // Adiciona informações do tipo de ausência se disponível
    if (data.absence_type) {
      result.absenceType = {
        id: data.absence_type.id,
        name: data.absence_type.name,
        color: data.absence_type.color,
      };
    }

    return result;
  }
}

