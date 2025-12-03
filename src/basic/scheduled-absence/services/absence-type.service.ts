import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateAbsenceTypeDto } from '../dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from '../dto/update-absence-type.dto';
import {
  AbsenceTypeResponseDto,
  PaginatedAbsenceTypeResponseDto,
} from '../dto/absence-type-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';

@Injectable()
export class AbsenceTypeService {
  private readonly tableName = 'absence_types';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    createAbsenceTypeDto: CreateAbsenceTypeDto,
  ): Promise<AbsenceTypeResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o nome já existe
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('name', createAbsenceTypeDto.name)
      .single();

    if (existing) {
      throw new ConflictException(
        'Absence type with this name already exists',
      );
    }

    const insertData: any = {
      name: createAbsenceTypeDto.name,
      color: createAbsenceTypeDto.color || '#AD82D9',
      active: createAbsenceTypeDto.active !== undefined ? createAbsenceTypeDto.active : true,
    };

    if (createAbsenceTypeDto.description) {
      insertData.description = createAbsenceTypeDto.description;
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
    name?: string,
    active?: boolean,
  ): Promise<PaginatedAbsenceTypeResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient.from(this.tableName).select('*', { count: 'exact' });

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    if (active !== undefined) {
      query = query.eq('active', active);
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

  async findOne(id: string): Promise<AbsenceTypeResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Absence type not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Absence type not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    id: string,
    updateAbsenceTypeDto: UpdateAbsenceTypeDto,
  ): Promise<AbsenceTypeResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o tipo existe
    await this.findOne(id);

    // Verifica se o nome já existe (se estiver sendo atualizado)
    if (updateAbsenceTypeDto.name) {
      const { data: existing } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('name', updateAbsenceTypeDto.name)
        .neq('id', id)
        .single();

      if (existing) {
        throw new ConflictException(
          'Absence type with this name already exists',
        );
      }
    }

    const updateData: any = {};
    if (updateAbsenceTypeDto.name !== undefined)
      updateData.name = updateAbsenceTypeDto.name;
    if (updateAbsenceTypeDto.description !== undefined)
      updateData.description = updateAbsenceTypeDto.description;
    if (updateAbsenceTypeDto.color !== undefined)
      updateData.color = updateAbsenceTypeDto.color;
    if (updateAbsenceTypeDto.active !== undefined)
      updateData.active = updateAbsenceTypeDto.active;

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o tipo existe
    await this.findOne(id);

    // Verifica se há scheduled absences usando este tipo
    const { data: scheduledAbsences } = await supabaseClient
      .from('scheduled_absences')
      .select('id')
      .eq('absence_type_id', id)
      .limit(1);

    if (scheduledAbsences && scheduledAbsences.length > 0) {
      throw new ConflictException(
        'Cannot delete absence type that is being used by scheduled absences',
      );
    }

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error);
    }
  }

  async toggle(id: string): Promise<AbsenceTypeResponseDto> {
    const absenceType = await this.findOne(id);
    return this.update(id, { active: !absenceType.active });
  }

  private mapToResponseDto(data: any): AbsenceTypeResponseDto {
    return {
      id: data.id,
      name: data.name,
      description: data.description || null,
      color: data.color,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

