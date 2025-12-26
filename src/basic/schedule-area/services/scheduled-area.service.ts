import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateScheduledAreaDto } from '../dto/create-scheduled-area.dto';
import { UpdateScheduledAreaDto } from '../dto/update-scheduled-area.dto';
import {
  ScheduledAreaResponseDto,
  ImageUploadResponseDto,
  PaginatedScheduledAreaResponseDto,
} from '../dto/scheduled-area-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import { MulterFile } from '../interfaces/file.interface';

@Injectable()
export class ScheduledAreaService {
  private readonly tableName = 'scheduled_areas';

  constructor(private supabaseService: SupabaseService) { }

  async create(
    createScheduledAreaDto: CreateScheduledAreaDto,
  ): Promise<ScheduledAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a pessoa responsável existe
    const { data: person } = await supabaseClient
      .from('persons')
      .select('id')
      .eq('id', createScheduledAreaDto.responsiblePersonId)
      .single();

    if (!person) {
      throw new NotFoundException('Responsible person not found');
    }

    const insertData: any = {
      name: createScheduledAreaDto.name,
      responsible_person_id: createScheduledAreaDto.responsiblePersonId,
      favorite: createScheduledAreaDto.favorite ?? false,
    };

    if (createScheduledAreaDto.description) {
      insertData.description = createScheduledAreaDto.description;
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
    favorite?: boolean,
  ): Promise<PaginatedScheduledAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select(
        '*, responsible_person:persons(id, full_name, email, photo_url)',
        { count: 'exact' },
      );

    if (favorite !== undefined) {
      query = query.eq('favorite', favorite);
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
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<ScheduledAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*, responsible_person:persons(id, full_name, email, photo_url)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Scheduled area not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Scheduled area not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    id: string,
    updateScheduledAreaDto: UpdateScheduledAreaDto,
  ): Promise<ScheduledAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área existe
    await this.findOne(id);

    // Verifica se a pessoa responsável existe (se estiver sendo atualizada)
    if (updateScheduledAreaDto.responsiblePersonId) {
      const { data: person } = await supabaseClient
        .from('persons')
        .select('id')
        .eq('id', updateScheduledAreaDto.responsiblePersonId)
        .single();

      if (!person) {
        throw new NotFoundException('Responsible person not found');
      }
    }

    const updateData: any = {};
    if (updateScheduledAreaDto.name !== undefined)
      updateData.name = updateScheduledAreaDto.name;
    if (updateScheduledAreaDto.description !== undefined)
      updateData.description = updateScheduledAreaDto.description;
    if (updateScheduledAreaDto.responsiblePersonId !== undefined)
      updateData.responsible_person_id = updateScheduledAreaDto.responsiblePersonId;
    if (updateScheduledAreaDto.favorite !== undefined)
      updateData.favorite = updateScheduledAreaDto.favorite;

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select('*, responsible_person:persons(id, full_name, email, photo_url)')
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área existe
    await this.findOne(id);

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error);
    }
  }

  async uploadImage(
    id: string,
    file: MulterFile,
    token?: string,
  ): Promise<ImageUploadResponseDto> {
    // Cria um cliente Supabase com o token do usuário autenticado para passar pelas políticas RLS
    const supabaseClient = token
      ? this.supabaseService.getClientWithToken(token)
      : this.supabaseService.getRawClient();

    // Verifica se a área existe
    await this.findOne(id);

    // Valida o arquivo
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only JPG, PNG, and GIF are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB');
    }

    // Upload para o Supabase Storage
    const fileExt = file.originalname.split('.').pop();
    const fileName = `area-${id}.${fileExt}`;
    const filePath = `scheduled-areas/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('scheduled-area-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(`Failed to upload image: ${uploadError.message}`);
    }

    // Obtém a URL pública da imagem
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from('scheduled-area-images').getPublicUrl(filePath);

    // Atualiza a URL da imagem na tabela
    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update({ image_url: publicUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return {
      message: 'Image uploaded successfully',
      imageUrl: publicUrl,
      scheduledAreaId: id,
    };
  }

  async deleteImage(id: string, token?: string): Promise<void> {
    // Cria um cliente Supabase com o token do usuário autenticado para passar pelas políticas RLS
    const supabaseClient = token
      ? this.supabaseService.getClientWithToken(token)
      : this.supabaseService.getRawClient();

    // Verifica se a área existe e tem imagem
    const area = await this.findOne(id);

    if (!area.imageUrl) {
      throw new NotFoundException('Image does not exist');
    }

    // Extrai o nome do arquivo da URL
    const urlParts = area.imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `scheduled-areas/${fileName}`;

    // Remove do storage
    const { error: deleteError } = await supabaseClient.storage
      .from('scheduled-area-images')
      .remove([filePath]);

    if (deleteError) {
      // Se não conseguir deletar do storage, apenas remove a referência
      console.warn(`Failed to delete image from storage: ${deleteError.message}`);
    }

    // Remove a referência da imagem na tabela
    const { error } = await supabaseClient
      .from(this.tableName)
      .update({ image_url: null })
      .eq('id', id);

    if (error) {
      handleSupabaseError(error);
    }
  }

  async toggleFavorite(
    id: string,
    favorite: boolean,
  ): Promise<ScheduledAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área existe
    await this.findOne(id);

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update({ favorite })
      .eq('id', id)
      .select('*, responsible_person:persons(id, full_name, email, photo_url)')
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  private mapToResponseDto(data: any): ScheduledAreaResponseDto {
    const result: ScheduledAreaResponseDto = {
      id: data.id,
      name: data.name,
      description: data.description || null,
      responsiblePersonId: data.responsible_person_id,
      responsiblePerson: null,
      imageUrl: data.image_url || null,
      favorite: data.favorite ?? false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Adiciona informações da pessoa responsável se disponível
    if (data.responsible_person) {
      result.responsiblePerson = {
        id: data.responsible_person.id,
        fullName: data.responsible_person.full_name,
        email: data.responsible_person.email,
        photoUrl: data.responsible_person.photo_url || null,
      };
    }

    return result;
  }

  async getOptimizedSchedules(
    areaId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área existe
    await this.findOne(areaId);

    const offset = (page - 1) * limit;

    const query = supabaseClient
      .from('schedules')
      .select(`
        *,
        schedule_members (
          id,
          status,
          present,
          person:persons (
            id,
            full_name,
            photo_url
          ),
          responsibility:responsibilities (
            id,
            name,
            image_url
          )
        )
      `, { count: 'exact' })
      .eq('scheduled_area_id', areaId)
      .order('start_datetime', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      handleSupabaseError(error);
    }

    return {
      data,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }
}

