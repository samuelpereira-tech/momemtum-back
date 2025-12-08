import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import {
  CreateScheduleMemberDto,
  UpdateScheduleMemberDto,
  ScheduleMemberResponseDto,
} from '../dto/schedule-member.dto';

@Injectable()
export class ScheduleMemberService {
  private readonly tableName = 'schedule_members';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    scheduleId: string,
    createDto: CreateScheduleMemberDto,
  ): Promise<ScheduleMemberResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se a pessoa existe e pertence à área
    await this.validatePersonInArea(scheduledAreaId, createDto.personId);

    // Verificar se a responsabilidade existe e pertence à área
    await this.validateResponsibilityInArea(scheduledAreaId, createDto.responsibilityId);

    // Verificar se a pessoa já está no schedule
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('person_id', createDto.personId)
      .single();

    if (existing) {
      throw new ConflictException('Person is already a member of this schedule');
    }

    // Criar membro
    const { data: member, error } = await supabaseClient
      .from(this.tableName)
      .insert({
        schedule_id: scheduleId,
        person_id: createDto.personId,
        responsibility_id: createDto.responsibilityId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(member);
  }

  async update(
    scheduledAreaId: string,
    scheduleId: string,
    memberId: string,
    updateDto: UpdateScheduleMemberDto,
  ): Promise<ScheduleMemberResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se o membro existe
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', memberId)
      .eq('schedule_id', scheduleId)
      .single();

    if (!existing) {
      throw new NotFoundException('Schedule member not found');
    }

    // Validar responsabilidade se fornecida
    if (updateDto.responsibilityId) {
      await this.validateResponsibilityInArea(scheduledAreaId, updateDto.responsibilityId);
    }

    const updateData: any = {};
    if (updateDto.responsibilityId) {
      updateData.responsibility_id = updateDto.responsibilityId;
    }
    if (updateDto.status) {
      updateData.status = updateDto.status;
    }

    const { data: member, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', memberId)
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(member);
  }

  async remove(
    scheduledAreaId: string,
    scheduleId: string,
    memberId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se o membro existe
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('id', memberId)
      .eq('schedule_id', scheduleId)
      .single();

    if (!existing) {
      throw new NotFoundException('Schedule member not found');
    }

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', memberId)
      .eq('schedule_id', scheduleId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private async validateSchedule(
    scheduledAreaId: string,
    scheduleId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Schedule not found');
    }
  }

  private async validatePersonInArea(
    scheduledAreaId: string,
    personId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from('person_areas')
      .select('id')
      .eq('person_id', personId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        'Person not found or not associated with the scheduled area',
      );
    }
  }

  private async validateResponsibilityInArea(
    scheduledAreaId: string,
    responsibilityId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se a responsabilidade existe e pertence à área
    const { data, error } = await supabaseClient
      .from('responsibilities')
      .select('id, scheduled_area_id')
      .eq('id', responsibilityId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        'Responsibility not found or not associated with the scheduled area',
      );
    }
  }

  private async mapToResponseDto(member: any): Promise<ScheduleMemberResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar informações da pessoa
    const { data: person } = await supabaseClient
      .from('persons')
      .select('id, full_name, email, photo_url')
      .eq('id', member.person_id)
      .single();

    // Buscar informações da responsabilidade
    const { data: responsibility } = await supabaseClient
      .from('responsibilities')
      .select('id, name, description, image_url')
      .eq('id', member.responsibility_id)
      .single();

    return {
      id: member.id,
      personId: member.person_id,
      person: person
        ? {
            id: person.id,
            fullName: person.full_name,
            email: person.email,
            photoUrl: person.photo_url,
          }
        : null,
      responsibilityId: member.responsibility_id,
      responsibility: responsibility
        ? {
            id: responsibility.id,
            name: responsibility.name,
            description: responsibility.description,
            imageUrl: responsibility.image_url,
          }
        : null,
      status: member.status,
      createdAt: member.created_at,
    };
  }
}



