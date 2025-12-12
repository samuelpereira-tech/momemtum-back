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
    if (oldValues.responsibilityId !== undefined) {
      await this.createLog(scheduleId, memberId, existing.person_id, 'member_responsibility_changed', {
        responsibilityId: oldValues.responsibilityId,
      }, {
        responsibilityId: updateDto.responsibilityId,
      }, changedBy);
    }

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
        case 'member_added': {
          const personName = personId
            ? await this.getPersonName(personId, supabaseClient)
            : 'Membro';
          const responsibilityName = newValue?.responsibilityId
            ? await this.getResponsibilityName(newValue.responsibilityId, supabaseClient)
            : null;
          return responsibilityName
            ? `${personName} foi adicionado(a) como ${responsibilityName}`
            : `${personName} foi adicionado(a)`;
        }

        case 'member_removed': {
          const personName = personId
            ? await this.getPersonName(personId, supabaseClient)
            : 'Membro';
          return `${personName} foi removido(a) da escala`;
        }

        case 'member_status_changed': {
          const personName = personId
            ? await this.getPersonName(personId, supabaseClient)
            : 'Membro';
          const oldStatus = this.translateStatus(oldValue?.status);
          const newStatus = this.translateStatus(newValue?.status);
          return `Status de ${personName} foi alterado de "${oldStatus}" para "${newStatus}"`;
        }

        case 'member_present_changed': {
          const personName = personId
            ? await this.getPersonName(personId, supabaseClient)
            : 'Membro';
          const oldPresent = oldValue?.present === true ? 'Presente' : oldValue?.present === false ? 'Ausente' : 'Não informado';
          const newPresent = newValue?.present === true ? 'Presente' : newValue?.present === false ? 'Ausente' : 'Não informado';
          return `Presença de ${personName} foi alterada de "${oldPresent}" para "${newPresent}"`;
        }

        case 'member_responsibility_changed': {
          const personName = personId
            ? await this.getPersonName(personId, supabaseClient)
            : 'Membro';
          const oldResponsibility = oldValue?.responsibilityId
            ? await this.getResponsibilityName(oldValue.responsibilityId, supabaseClient)
            : 'Não definida';
          const newResponsibility = newValue?.responsibilityId
            ? await this.getResponsibilityName(newValue.responsibilityId, supabaseClient)
            : 'Não definida';
          return `Função de ${personName} foi alterada de "${oldResponsibility}" para "${newResponsibility}"`;
        }

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

  private async getResponsibilityName(responsibilityId: string, supabaseClient: any): Promise<string> {
    try {
      const { data } = await supabaseClient
        .from('responsibilities')
        .select('name')
        .eq('id', responsibilityId)
        .single();
      return data?.name || 'Função não encontrada';
    } catch {
      return 'Função não encontrada';
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

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      pending: 'Pendente',
      accepted: 'Aceito',
      rejected: 'Rejeitado',
    };
    return translations[status] || status;
  }

  private translateScheduleStatus(status: string): string {
    const translations: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
    };
    return translations[status] || status;
  }
}



