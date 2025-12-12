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

  async findAll(
    scheduledAreaId: string,
    scheduleId: string,
  ): Promise<ScheduleCommentResponseDto[]> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verificar se o schedule existe e pertence à área
    await this.validateSchedule(scheduledAreaId, scheduleId);

    // Buscar todos os comentários do schedule
    const { data: comments, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: true });

    if (error) {
      handleSupabaseError(error);
    }

    // Se não houver comentários, retornar array vazio
    if (!comments || comments.length === 0) {
      return [];
    }

    // Mapear para DTOs - tratar erros individualmente para não perder todos os comentários
    const commentsPromises = comments.map(async (comment) => {
      try {
        return await this.mapToResponseDto(comment);
      } catch (error) {
        // Se houver erro ao mapear um comentário, retornar um DTO básico
        console.error('Error mapping comment:', error);
        return {
          id: comment.id,
          content: comment.content,
          authorId: comment.author_id,
          authorName: 'Unknown',
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
        };
      }
    });
    
    return Promise.all(commentsPromises);
  }

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
    // Nota: author_id é um UUID do Supabase Auth (auth.users), não da tabela persons
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
    // O author_id é um UUID do Supabase Auth (auth.users), não da tabela persons
    // Por enquanto, retornamos 'Unknown' como nome do autor
    // Para obter o nome real, seria necessário:
    // 1. Criar uma view/função no banco que faça join com auth.users, ou
    // 2. Usar o serviço admin do Supabase (requer permissões especiais), ou
    // 3. Armazenar o nome do autor no momento da criação do comentário
    
    // Tentativa de buscar da tabela persons (caso exista uma relação)
    // Isso é apenas um fallback caso o sistema tenha uma tabela de mapeamento
    let authorName = 'Unknown';
    if (comment.author_id) {
      try {
        const supabaseClient = this.supabaseService.getRawClient();
        const { data: person, error: personError } = await supabaseClient
          .from('persons')
          .select('full_name')
          .eq('id', comment.author_id)
          .maybeSingle();
        
        if (!personError && person?.full_name) {
          authorName = person.full_name;
        }
      } catch (error) {
        // Se não encontrar, mantém 'Unknown'
        // O author_id é do auth.users, não necessariamente existe em persons
      }
    }

    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.author_id,
      authorName,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    };
  }
}





