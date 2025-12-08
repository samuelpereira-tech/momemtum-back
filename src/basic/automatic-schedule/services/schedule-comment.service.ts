import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import {
  CreateScheduleCommentDto,
  UpdateScheduleCommentDto,
  ScheduleCommentResponseDto,
} from '../dto/schedule-comment.dto';

@Injectable()
export class ScheduleCommentService {
  private readonly tableName = 'schedule_comments';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    scheduleId: string,
    createDto: CreateScheduleCommentDto,
    userId: string,
  ): Promise<ScheduleCommentResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Criar comentário
    const { data: comment, error } = await supabaseClient
      .from(this.tableName)
      .insert({
        schedule_id: scheduleId,
        content: createDto.content.trim(),
        author_id: userId,
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(comment);
  }

  async update(
    scheduledAreaId: string,
    scheduleId: string,
    commentId: string,
    updateDto: UpdateScheduleCommentDto,
    userId: string,
  ): Promise<ScheduleCommentResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se o comentário existe e pertence ao usuário
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', commentId)
      .eq('schedule_id', scheduleId)
      .single();

    if (!existing) {
      throw new NotFoundException('Schedule comment not found');
    }

    // Verificar se o usuário é o autor (ou admin - implementar verificação de admin depois)
    if (existing.author_id !== userId) {
      throw new ForbiddenException('Only the comment author can update the comment');
    }

    const { data: comment, error } = await supabaseClient
      .from(this.tableName)
      .update({
        content: updateDto.content.trim(),
      })
      .eq('id', commentId)
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(comment);
  }

  async remove(
    scheduledAreaId: string,
    scheduleId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Verificar se o comentário existe
    const { data: existing } = await supabaseClient
      .from(this.tableName)
      .select('author_id')
      .eq('id', commentId)
      .eq('schedule_id', scheduleId)
      .single();

    if (!existing) {
      throw new NotFoundException('Schedule comment not found');
    }

    // Verificar se o usuário é o autor (ou admin - implementar verificação de admin depois)
    if (existing.author_id !== userId) {
      throw new ForbiddenException('Only the comment author can delete the comment');
    }

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', commentId)
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

  private async mapToResponseDto(comment: any): Promise<ScheduleCommentResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Buscar informações do autor
    const { data: author } = await supabaseClient
      .from('persons')
      .select('id, full_name')
      .eq('id', comment.author_id)
      .single();

    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.author_id,
      authorName: author?.full_name || 'Unknown',
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    };
  }
}



