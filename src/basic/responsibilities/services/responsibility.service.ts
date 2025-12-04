import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateResponsibilityDto } from '../dto/create-responsibility.dto';
import { UpdateResponsibilityDto } from '../dto/update-responsibility.dto';
import {
  ResponsibilityResponseDto,
  PaginatedResponsibilityResponseDto,
  ImageUploadResponseDto,
} from '../dto/responsibility-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';
import { MulterFile } from '../interfaces/file.interface';

@Injectable()
export class ResponsibilityService {
  private readonly tableName = 'responsibilities';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    createResponsibilityDto: CreateResponsibilityDto,
  ): Promise<ResponsibilityResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', createResponsibilityDto.scheduledAreaId)
      .single();

    if (!area) {
      throw new NotFoundException('Scheduled area not found');
    }

    const insertData: any = {
      name: createResponsibilityDto.name,
      scheduled_area_id: createResponsibilityDto.scheduledAreaId,
    };

    if (createResponsibilityDto.description) {
      insertData.description = createResponsibilityDto.description;
    }

    if (createResponsibilityDto.imageUrl) {
      insertData.image_url = createResponsibilityDto.imageUrl;
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
    scheduledAreaId?: string,
  ): Promise<PaginatedResponsibilityResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select(
        '*, scheduled_area:scheduled_areas(id, name)',
        { count: 'exact' },
      );

    if (scheduledAreaId) {
      query = query.eq('scheduled_area_id', scheduledAreaId);
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

  async findOne(id: string): Promise<ResponsibilityResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*, scheduled_area:scheduled_areas(id, name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Responsibility not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Responsibility not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    id: string,
    updateResponsibilityDto: UpdateResponsibilityDto,
  ): Promise<ResponsibilityResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a responsabilidade existe
    await this.findOne(id);

    // Verifica se a área agendada existe (se estiver sendo atualizada)
    if (updateResponsibilityDto.scheduledAreaId) {
      const { data: area } = await supabaseClient
        .from('scheduled_areas')
        .select('id')
        .eq('id', updateResponsibilityDto.scheduledAreaId)
        .single();

      if (!area) {
        throw new NotFoundException('Scheduled area not found');
      }
    }

    const updateData: any = {};
    if (updateResponsibilityDto.name !== undefined)
      updateData.name = updateResponsibilityDto.name;
    if (updateResponsibilityDto.description !== undefined)
      updateData.description = updateResponsibilityDto.description;
    if (updateResponsibilityDto.scheduledAreaId !== undefined)
      updateData.scheduled_area_id = updateResponsibilityDto.scheduledAreaId;
    if (updateResponsibilityDto.imageUrl !== undefined)
      updateData.image_url = updateResponsibilityDto.imageUrl;

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select('*, scheduled_area:scheduled_areas(id, name)')
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a responsabilidade existe
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

    // Verifica se a responsabilidade existe
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
    const fileName = `responsibility-${id}.${fileExt}`;
    const filePath = `responsibilities/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('responsibility-images')
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
    } = supabaseClient.storage.from('responsibility-images').getPublicUrl(filePath);

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
      responsibilityId: id,
    };
  }

  async deleteImage(id: string, token?: string): Promise<void> {
    // Cria um cliente Supabase com o token do usuário autenticado para passar pelas políticas RLS
    const supabaseClient = token
      ? this.supabaseService.getClientWithToken(token)
      : this.supabaseService.getRawClient();

    // Verifica se a responsabilidade existe e tem imagem
    const responsibility = await this.findOne(id);

    if (!responsibility.imageUrl) {
      throw new NotFoundException('Image does not exist');
    }

    // Extrai o nome do arquivo da URL
    const urlParts = responsibility.imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `responsibilities/${fileName}`;

    // Remove do storage
    const { error: deleteError } = await supabaseClient.storage
      .from('responsibility-images')
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

  private mapToResponseDto(data: any): ResponsibilityResponseDto {
    const result: ResponsibilityResponseDto = {
      id: data.id,
      name: data.name,
      description: data.description || null,
      scheduledAreaId: data.scheduled_area_id,
      scheduledArea: null,
      imageUrl: data.image_url || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Adiciona informações da área agendada se disponível
    if (data.scheduled_area) {
      result.scheduledArea = {
        id: data.scheduled_area.id,
        name: data.scheduled_area.name,
      };
    }

    return result;
  }
}

