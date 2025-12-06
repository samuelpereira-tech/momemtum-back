import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreateGroupMemberDto } from '../dto/create-group-member.dto';
import { UpdateGroupMemberDto } from '../dto/update-group-member.dto';
import {
  GroupMemberResponseDto,
  PaginatedGroupMemberResponseDto,
} from '../dto/group-member-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';

@Injectable()
export class GroupMemberService {
  private readonly tableName = 'area_group_members';
  private readonly junctionTableName = 'area_group_member_responsibilities';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    groupId: string,
    createGroupMemberDto: CreateGroupMemberDto,
  ): Promise<GroupMemberResponseDto> {
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

    // Verifica se o grupo existe e pertence à área
    const { data: group, error: groupError } = await supabaseClient
      .from('area_groups')
      .select('id')
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Group not found');
    }

    // Verifica se a pessoa existe
    const { data: person, error: personError } = await supabaseClient
      .from('persons')
      .select('id')
      .eq('id', createGroupMemberDto.personId)
      .single();

    if (personError || !person) {
      throw new BadRequestException('Person not found');
    }

    // Verifica se a pessoa está associada à área (via person_areas)
    const { data: personArea, error: personAreaError } = await supabaseClient
      .from('person_areas')
      .select('id')
      .eq('person_id', createGroupMemberDto.personId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (personAreaError || !personArea) {
      throw new BadRequestException(
        'Person is not associated with this scheduled area',
      );
    }

    // Verifica se a pessoa já é membro do grupo
    const { data: existingMember } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('group_id', groupId)
      .eq('person_id', createGroupMemberDto.personId)
      .single();

    if (existingMember) {
      throw new ConflictException(
        'Person is already a member of this group',
      );
    }

    // Verifica se todas as responsabilidades existem e pertencem à área
    const { data: responsibilities, error: respError } = await supabaseClient
      .from('responsibilities')
      .select('id')
      .in('id', createGroupMemberDto.responsibilityIds)
      .eq('scheduled_area_id', scheduledAreaId);

    if (respError) {
      handleSupabaseError(respError);
    }

    if (!responsibilities || responsibilities.length === 0) {
      throw new BadRequestException(
        'No valid responsibilities found for this scheduled area',
      );
    }

    if (
      responsibilities.length !== createGroupMemberDto.responsibilityIds.length
    ) {
      throw new BadRequestException(
        'One or more responsibilities do not exist or do not belong to this scheduled area',
      );
    }

    // Cria a associação pessoa-grupo
    const { data: groupMember, error: insertError } = await supabaseClient
      .from(this.tableName)
      .insert({
        person_id: createGroupMemberDto.personId,
        group_id: groupId,
      })
      .select()
      .single();

    if (insertError) {
      handleSupabaseError(insertError);
    }

    // Cria as associações de responsabilidades
    const responsibilityInserts = createGroupMemberDto.responsibilityIds.map(
      (responsibilityId) => ({
        group_member_id: groupMember.id,
        responsibility_id: responsibilityId,
      }),
    );

    const { error: junctionError } = await supabaseClient
      .from(this.junctionTableName)
      .insert(responsibilityInserts);

    if (junctionError) {
      // Remove a associação pessoa-grupo se falhar ao inserir responsabilidades
      await supabaseClient
        .from(this.tableName)
        .delete()
        .eq('id', groupMember.id);
      handleSupabaseError(junctionError);
    }

    return this.findOne(scheduledAreaId, groupId, groupMember.id);
  }

  async findAll(
    scheduledAreaId: string,
    groupId: string,
    page: number = 1,
    limit: number = 10,
    personName?: string,
    personEmail?: string,
    responsibilityId?: string,
  ): Promise<PaginatedGroupMemberResponseDto> {
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

    // Verifica se o grupo existe e pertence à área
    const { data: group, error: groupError } = await supabaseClient
      .from('area_groups')
      .select('id')
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Group not found');
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    // Se há filtro por responsibilityId, primeiro busca os group_member_ids que têm essa responsabilidade
    let groupMemberIdsFilter: string[] | undefined;
    if (responsibilityId) {
      const { data: junctionData, error: junctionError } = await supabaseClient
        .from(this.junctionTableName)
        .select('group_member_id')
        .eq('responsibility_id', responsibilityId);

      if (junctionError) {
        handleSupabaseError(junctionError);
      }

      if (!junctionData || junctionData.length === 0) {
        // Nenhum membro tem essa responsabilidade, retorna lista vazia
        return {
          data: [],
          meta: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        };
      }

      groupMemberIdsFilter = junctionData.map((item) => item.group_member_id);
    }

    // Constrói a query base
    let query = supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        person:persons(id, full_name, email, photo_url),
        group:area_groups(id, name),
        responsibilities:area_group_member_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
        { count: 'exact' },
      )
      .eq('group_id', groupId);

    // Aplica filtro por responsibilityId se existir
    if (groupMemberIdsFilter) {
      query = query.in('id', groupMemberIdsFilter);
    }

    // Se há filtros de nome ou email, precisa buscar todos os dados primeiro
    // para aplicar os filtros antes da paginação
    let allData: any[] | null = null;
    let total = 0;

    if (personName || personEmail) {
      // Busca todos os dados para aplicar filtros
      const { data: fullData, error: fullError } = await supabaseClient
        .from(this.tableName)
        .select(
          `
          *,
          person:persons(id, full_name, email, photo_url),
          group:area_groups(id, name),
          responsibilities:area_group_member_responsibilities(
            responsibility:responsibilities(id, name, description, image_url)
          )
        `,
        )
        .eq('group_id', groupId);

      if (fullError) {
        handleSupabaseError(fullError);
      }

      allData = fullData || [];

      // Aplica filtro por responsibilityId se existir
      if (groupMemberIdsFilter) {
        allData = allData.filter((item: any) =>
          groupMemberIdsFilter!.includes(item.id),
        );
      }

      // Aplica filtros de nome e email
      if (personName) {
        allData = allData.filter(
          (item: any) =>
            item.person &&
            item.person.full_name
              .toLowerCase()
              .includes(personName.toLowerCase()),
        );
      }

      if (personEmail) {
        allData = allData.filter(
          (item: any) =>
            item.person &&
            item.person.email.toLowerCase().includes(personEmail.toLowerCase()),
        );
      }

      total = allData.length;
      const totalPages = Math.ceil(total / limitNum);

      // Aplica paginação
      const paginatedData = allData
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(offset, offset + limitNum);

      const processedData = paginatedData.map((item: any) =>
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

    // Se não há filtros em memória, usa a query normal com paginação
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    total = count || 0;
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
    memberId: string,
  ): Promise<GroupMemberResponseDto> {
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

    // Verifica se o grupo existe e pertence à área
    const { data: group, error: groupError } = await supabaseClient
      .from('area_groups')
      .select('id')
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Group not found');
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        person:persons(id, full_name, email, photo_url),
        group:area_groups(id, name),
        responsibilities:area_group_member_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
      )
      .eq('id', memberId)
      .eq('group_id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Group member not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Group member not found');
    }

    return this.mapToResponseDto(data);
  }

  async findByPersonId(
    scheduledAreaId: string,
    groupId: string,
    personId: string,
  ): Promise<GroupMemberResponseDto> {
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

    // Verifica se o grupo existe e pertence à área
    const { data: group, error: groupError } = await supabaseClient
      .from('area_groups')
      .select('id')
      .eq('id', groupId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Group not found');
    }

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        person:persons(id, full_name, email, photo_url),
        group:area_groups(id, name),
        responsibilities:area_group_member_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
      )
      .eq('person_id', personId)
      .eq('group_id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(
          'Person is not a member of this group',
        );
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Person is not a member of this group');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    scheduledAreaId: string,
    groupId: string,
    memberId: string,
    updateGroupMemberDto: UpdateGroupMemberDto,
  ): Promise<GroupMemberResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o membro existe
    await this.findOne(scheduledAreaId, groupId, memberId);

    // Verifica se todas as responsabilidades existem e pertencem à área
    const { data: responsibilities, error: respError } = await supabaseClient
      .from('responsibilities')
      .select('id')
      .in('id', updateGroupMemberDto.responsibilityIds)
      .eq('scheduled_area_id', scheduledAreaId);

    if (respError) {
      handleSupabaseError(respError);
    }

    if (!responsibilities || responsibilities.length === 0) {
      throw new BadRequestException(
        'No valid responsibilities found for this scheduled area',
      );
    }

    if (
      responsibilities.length !== updateGroupMemberDto.responsibilityIds.length
    ) {
      throw new BadRequestException(
        'One or more responsibilities do not exist or do not belong to this scheduled area',
      );
    }

    // Remove todas as responsabilidades existentes
    const { error: deleteError } = await supabaseClient
      .from(this.junctionTableName)
      .delete()
      .eq('group_member_id', memberId);

    if (deleteError) {
      handleSupabaseError(deleteError);
    }

    // Insere as novas responsabilidades
    const responsibilityInserts = updateGroupMemberDto.responsibilityIds.map(
      (responsibilityId) => ({
        group_member_id: memberId,
        responsibility_id: responsibilityId,
      }),
    );

    const { error: insertError } = await supabaseClient
      .from(this.junctionTableName)
      .insert(responsibilityInserts);

    if (insertError) {
      handleSupabaseError(insertError);
    }

    // Atualiza o updated_at do membro
    const { error: updateError } = await supabaseClient
      .from(this.tableName)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      handleSupabaseError(updateError);
    }

    return this.findOne(scheduledAreaId, groupId, memberId);
  }

  async remove(
    scheduledAreaId: string,
    groupId: string,
    memberId: string,
  ): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se o membro existe
    await this.findOne(scheduledAreaId, groupId, memberId);

    // Remove o membro (as responsabilidades serão removidas automaticamente por CASCADE)
    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', memberId)
      .eq('group_id', groupId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private mapToResponseDto(data: any): GroupMemberResponseDto {
    const result: GroupMemberResponseDto = {
      id: data.id,
      personId: data.person_id,
      person: null,
      groupId: data.group_id,
      group: null,
      responsibilities: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Adiciona informações da pessoa se disponível
    if (data.person) {
      result.person = {
        id: data.person.id,
        fullName: data.person.full_name,
        email: data.person.email,
        photoUrl: data.person.photo_url || null,
      };
    }

    // Adiciona informações do grupo se disponível
    if (data.group) {
      result.group = {
        id: data.group.id,
        name: data.group.name,
      };
    }

    // Adiciona responsabilidades
    if (data.responsibilities && Array.isArray(data.responsibilities)) {
      result.responsibilities = data.responsibilities
        .filter((item: any) => item.responsibility)
        .map((item: any) => ({
          id: item.responsibility.id,
          name: item.responsibility.name,
          description: item.responsibility.description || null,
          imageUrl: item.responsibility.image_url || null,
        }));
    }

    return result;
  }
}

