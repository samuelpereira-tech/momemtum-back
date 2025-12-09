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
    changedBy?: string,
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
        present: null,
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    // Criar log de adição
    await this.createLog(scheduleId, member.id, createDto.personId, 'member_added', null, {
      personId: createDto.personId,
      responsibilityId: createDto.responsibilityId,
      status: 'pending',
      present: null,
    }, changedBy);

    return this.mapToResponseDto(member);
  }

  async update(
    scheduledAreaId: string,
    scheduleId: string,
    memberId: string,
    updateDto: UpdateScheduleMemberDto,
    changedBy?: string,
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
    const oldValues: any = {};

    if (updateDto.responsibilityId !== undefined && updateDto.responsibilityId !== existing.responsibility_id) {
      oldValues.responsibilityId = existing.responsibility_id;
      updateData.responsibility_id = updateDto.responsibilityId;
    }
    if (updateDto.status !== undefined && updateDto.status !== existing.status) {
      oldValues.status = existing.status;
      updateData.status = updateDto.status;
    }
    if (updateDto.present !== undefined && updateDto.present !== existing.present) {
      oldValues.present = existing.present;
      updateData.present = updateDto.present;
    }

    // Se não há mudanças, retornar sem atualizar
    if (Object.keys(updateData).length === 0) {
      return this.mapToResponseDto(existing);
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

    // Criar logs para cada mudança
    if (oldValues.status !== undefined) {
      await this.createLog(scheduleId, memberId, existing.person_id, 'member_status_changed', {
        status: oldValues.status,
      }, {
        status: updateDto.status,
      }, changedBy);
    }

    if (oldValues.present !== undefined) {
      await this.createLog(scheduleId, memberId, existing.person_id, 'member_present_changed', {
        present: oldValues.present,
      }, {
        present: updateDto.present,
      }, changedBy);
    }

    return this.mapToResponseDto(member);
  }

  async remove(
    scheduledAreaId: string,
    scheduleId: string,
    memberId: string,
    changedBy?: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se o membro existe e obter dados para o log
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('*')
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

    // Criar log de remoção
    await this.createLog(scheduleId, memberId, existing.person_id, 'member_removed', {
      personId: existing.person_id,
      responsibilityId: existing.responsibility_id,
      status: existing.status,
      present: existing.present,
    }, null, changedBy);
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
      present: member.present,
      createdAt: member.created_at,
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

    const { error } = await supabaseClient
      .from('schedule_members_logs')
      .insert({
        schedule_id: scheduleId,
        schedule_member_id: scheduleMemberId,
        person_id: personId,
        change_type: changeType,
        old_value: oldValue || null,
        new_value: newValue || null,
        changed_by: changedBy || null,
      });

    if (error) {
      // Não falhar a operação principal se o log falhar, apenas logar o erro
      console.error('Error creating schedule_members_log:', error);
    }
  }
}



