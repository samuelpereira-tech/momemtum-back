import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import {
  GroupResponseDto,
  PaginatedGroupResponseDto,
} from '../dto/group-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';

@Injectable()
export class GroupService {
  private readonly tableName = 'area_groups';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    createGroupDto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    // Verifica se já existe um grupo com o mesmo nome na área
    const { data: existingGroup } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('scheduled_area_id', scheduledAreaId)
      .eq('name', createGroupDto.name)
      .single();

    if (existingGroup) {
      throw new ConflictException(
        'Group with this name already exists in the scheduled area',
      );
    }

    const insertData: any = {
      name: createGroupDto.name,
      scheduled_area_id: scheduledAreaId,
    };

    if (createGroupDto.description) {
      insertData.description = createGroupDto.description;
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.findOne(scheduledAreaId, data.id);
  }

  async findAll(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
    name?: string,
  ): Promise<PaginatedGroupResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        scheduled_area:scheduled_areas(id, name),
        members:area_group_members(
          id,
          person:persons(id, full_name, email, photo_url),
          responsibilities:area_group_member_responsibilities(
            responsibility:responsibilities(id, name, description, image_url)
          )
        )
      `,
        { count: 'exact' },
      )
      .eq('scheduled_area_id', scheduledAreaId);

    // Aplica filtro por nome se fornecido
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    // Processa os dados para o formato correto
    const processedData = (data || []).map((item: any) =>
      this.mapToResponseDto(item),
    );

    return {
      data: processedData,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    scheduledAreaId: string,
    groupId: string,
  ): Promise<GroupResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a área agendada existe
    const { data: area, error: areaError } = await supabaseClient
      .from('scheduled_areas')
      .select('id')
      .eq('id', scheduledAreaId)
      .single();

    if (areaError || !area) {
      throw new NotFoundException('Scheduled area not found');
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        scheduled_area:scheduled_areas(id, name),
        members:area_group_members(
          id,
          person:persons(id, full_name, email, photo_url),
          responsibilities:area_group_member_responsibilities(
            responsibility:responsibilities(id, name, description, image_url)
          )
        )
      `,
      )
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Group not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Group not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    scheduledAreaId: string,
    groupId: string,
    updateGroupDto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o grupo existe
    await this.findOne(scheduledAreaId, groupId);

    // Se está atualizando o nome, verifica se já existe outro grupo com o mesmo nome
    if (updateGroupDto.name) {
      const { data: existingGroup } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('scheduled_area_id', scheduledAreaId)
        .eq('name', updateGroupDto.name)
        .neq('id', groupId)
        .single();

      if (existingGroup) {
        throw new ConflictException(
          'Group with this name already exists in the scheduled area',
        );
      }
    }

    const updateData: any = {};
    if (updateGroupDto.name !== undefined) updateData.name = updateGroupDto.name;
    if (updateGroupDto.description !== undefined)
      updateData.description = updateGroupDto.description;

    const { error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }

    return this.findOne(scheduledAreaId, groupId);
  }

  async remove(scheduledAreaId: string, groupId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o grupo existe
    await this.findOne(scheduledAreaId, groupId);

    // Remove o grupo (os membros serão removidos automaticamente por CASCADE)
    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private mapToResponseDto(data: any): GroupResponseDto {
    const result: GroupResponseDto = {
      id: data.id,
      name: data.name,
      description: data.description || null,
      scheduledAreaId: data.scheduled_area_id,
      scheduledArea: null,
      membersCount: 0,
      members: [],
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

    // Processa membros
    if (data.members && Array.isArray(data.members)) {
      result.membersCount = data.members.length;
      result.members = data.members.map((member: any) => {
        const memberDto: any = {
          id: member.id,
          personId: member.person_id,
          person: null,
          groupId: data.id,
          responsibilities: [],
          createdAt: member.created_at,
          updatedAt: member.updated_at,
        };

        // Adiciona informações da pessoa se disponível
        if (member.person) {
          memberDto.person = {
            id: member.person.id,
            fullName: member.person.full_name,
            email: member.person.email,
            photoUrl: member.person.photo_url || null,
          };
        }

        // Adiciona responsabilidades
        if (member.responsibilities && Array.isArray(member.responsibilities)) {
          memberDto.responsibilities = member.responsibilities
            .filter((item: any) => item.responsibility)
            .map((item: any) => ({
              id: item.responsibility.id,
              name: item.responsibility.name,
              description: item.responsibility.description || null,
              imageUrl: item.responsibility.image_url || null,
            }));
        }

        return memberDto;
      });
    }

    return result;
  }
}

