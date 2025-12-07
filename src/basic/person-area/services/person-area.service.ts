import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreatePersonAreaDto } from '../dto/create-person-area.dto';
import { UpdatePersonAreaDto } from '../dto/update-person-area.dto';
import {
  PersonAreaResponseDto,
  PaginatedPersonAreaResponseDto,
} from '../dto/person-area-response.dto';
import { handleSupabaseError } from '../../../authentication/core/utils/error-handler.util';

@Injectable()
export class PersonAreaService {
  private readonly tableName = 'person_areas';
  private readonly junctionTableName = 'person_area_responsibilities';

  constructor(private supabaseService: SupabaseService) {}

  async create(
    scheduledAreaId: string,
    createPersonAreaDto: CreatePersonAreaDto,
  ): Promise<PersonAreaResponseDto> {
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

    // Verifica se a pessoa existe
    const { data: person, error: personError } = await supabaseClient
      .from('persons')
      .select('id')
      .eq('id', createPersonAreaDto.personId)
      .single();

    if (personError || !person) {
      throw new BadRequestException('Person not found');
    }

    // Verifica se a pessoa já está associada à área
    const { data: existingAssociation } = await supabaseClient
      .from(this.tableName)
      .select('id')
      .eq('person_id', createPersonAreaDto.personId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (existingAssociation) {
      throw new ConflictException(
        'Person is already associated with this scheduled area',
      );
    }

    // Verifica se todas as responsabilidades existem e pertencem à área (se houver)
    if (
      createPersonAreaDto.responsibilityIds &&
      createPersonAreaDto.responsibilityIds.length > 0
    ) {
      const { data: responsibilities, error: respError } = await supabaseClient
        .from('responsibilities')
        .select('id')
        .in('id', createPersonAreaDto.responsibilityIds)
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
        responsibilities.length !== createPersonAreaDto.responsibilityIds.length
      ) {
        throw new BadRequestException(
          'One or more responsibilities do not exist or do not belong to this scheduled area',
        );
      }
    }

    // Cria a associação pessoa-área
    const { data: personArea, error: insertError } = await supabaseClient
      .from(this.tableName)
      .insert({
        person_id: createPersonAreaDto.personId,
        scheduled_area_id: scheduledAreaId,
      })
      .select()
      .single();

    if (insertError) {
      handleSupabaseError(insertError);
    }

    // Cria as associações de responsabilidades (se houver)
    if (
      createPersonAreaDto.responsibilityIds &&
      createPersonAreaDto.responsibilityIds.length > 0
    ) {
      const responsibilityInserts = createPersonAreaDto.responsibilityIds.map(
        (responsibilityId) => ({
          person_area_id: personArea.id,
          responsibility_id: responsibilityId,
        }),
      );

      const { error: junctionError } = await supabaseClient
        .from(this.junctionTableName)
        .insert(responsibilityInserts);

      if (junctionError) {
        // Remove a associação pessoa-área se falhar ao inserir responsabilidades
        await supabaseClient
          .from(this.tableName)
          .delete()
          .eq('id', personArea.id);
        handleSupabaseError(junctionError);
      }
    }

    return this.findOne(scheduledAreaId, personArea.id);
  }

  async findAll(
    scheduledAreaId: string,
    page: number = 1,
    limit: number = 10,
    personName?: string,
    personEmail?: string,
    responsibilityId?: string,
  ): Promise<PaginatedPersonAreaResponseDto> {
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

    // Se há filtro por responsibilityId, primeiro busca os person_area_ids que têm essa responsabilidade
    let personAreaIdsFilter: string[] | undefined;
    if (responsibilityId) {
      const { data: junctionData, error: junctionError } = await supabaseClient
        .from(this.junctionTableName)
        .select('person_area_id')
        .eq('responsibility_id', responsibilityId);

      if (junctionError) {
        handleSupabaseError(junctionError);
      }

      if (!junctionData || junctionData.length === 0) {
        // Nenhuma pessoa tem essa responsabilidade, retorna lista vazia
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

      personAreaIdsFilter = junctionData.map((item) => item.person_area_id);
    }

    // Constrói a query base
    let query = supabaseClient
      .from(this.tableName)
      .select(
        `
        *,
        person:persons(id, full_name, email, photo_url),
        scheduled_area:scheduled_areas(id, name),
        responsibilities:person_area_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
        { count: 'exact' },
      )
      .eq('scheduled_area_id', scheduledAreaId);

    // Aplica filtro por responsibilityId se existir
    if (personAreaIdsFilter) {
      query = query.in('id', personAreaIdsFilter);
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
          scheduled_area:scheduled_areas(id, name),
          responsibilities:person_area_responsibilities(
            responsibility:responsibilities(id, name, description, image_url)
          )
        `,
        )
        .eq('scheduled_area_id', scheduledAreaId);

      if (fullError) {
        handleSupabaseError(fullError);
      }

      allData = fullData || [];

      // Aplica filtro por responsibilityId se existir
      if (personAreaIdsFilter) {
        allData = allData.filter((item: any) =>
          personAreaIdsFilter!.includes(item.id),
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
    personAreaId: string,
  ): Promise<PersonAreaResponseDto> {
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
        person:persons(id, full_name, email, photo_url),
        scheduled_area:scheduled_areas(id, name),
        responsibilities:person_area_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
      )
      .eq('id', personAreaId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(
          'Person area association not found',
        );
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Person area association not found');
    }

    return this.mapToResponseDto(data);
  }

  async findByPersonId(
    scheduledAreaId: string,
    personId: string,
  ): Promise<PersonAreaResponseDto> {
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
        person:persons(id, full_name, email, photo_url),
        scheduled_area:scheduled_areas(id, name),
        responsibilities:person_area_responsibilities(
          responsibility:responsibilities(id, name, description, image_url)
        )
      `,
      )
      .eq('person_id', personId)
      .eq('scheduled_area_id', scheduledAreaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(
          'Person not associated with this scheduled area',
        );
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException(
        'Person not associated with this scheduled area',
      );
    }

    return this.mapToResponseDto(data);
  }

  async update(
    scheduledAreaId: string,
    personAreaId: string,
    updatePersonAreaDto: UpdatePersonAreaDto,
  ): Promise<PersonAreaResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a associação existe
    await this.findOne(scheduledAreaId, personAreaId);

    // Verifica se todas as responsabilidades existem e pertencem à área (se houver)
    if (
      updatePersonAreaDto.responsibilityIds &&
      updatePersonAreaDto.responsibilityIds.length > 0
    ) {
      const { data: responsibilities, error: respError } = await supabaseClient
        .from('responsibilities')
        .select('id')
        .in('id', updatePersonAreaDto.responsibilityIds)
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
        responsibilities.length !== updatePersonAreaDto.responsibilityIds.length
      ) {
        throw new BadRequestException(
          'One or more responsibilities do not exist or do not belong to this scheduled area',
        );
      }
    }

    // Remove todas as responsabilidades existentes
    const { error: deleteError } = await supabaseClient
      .from(this.junctionTableName)
      .delete()
      .eq('person_area_id', personAreaId);

    if (deleteError) {
      handleSupabaseError(deleteError);
    }

    // Insere as novas responsabilidades (se houver)
    if (
      updatePersonAreaDto.responsibilityIds &&
      updatePersonAreaDto.responsibilityIds.length > 0
    ) {
      const responsibilityInserts = updatePersonAreaDto.responsibilityIds.map(
        (responsibilityId) => ({
          person_area_id: personAreaId,
          responsibility_id: responsibilityId,
        }),
      );

      const { error: insertError } = await supabaseClient
        .from(this.junctionTableName)
        .insert(responsibilityInserts);

      if (insertError) {
        handleSupabaseError(insertError);
      }
    }

    // Atualiza o updated_at da associação pessoa-área
    const { error: updateError } = await supabaseClient
      .from(this.tableName)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', personAreaId);

    if (updateError) {
      handleSupabaseError(updateError);
    }

    return this.findOne(scheduledAreaId, personAreaId);
  }

  async remove(scheduledAreaId: string, personAreaId: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a associação existe
    await this.findOne(scheduledAreaId, personAreaId);

    // Remove a associação (as responsabilidades serão removidas automaticamente por CASCADE)
    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', personAreaId)
      .eq('scheduled_area_id', scheduledAreaId);

    if (error) {
      handleSupabaseError(error);
    }
  }

  private mapToResponseDto(data: any): PersonAreaResponseDto {
    const result: PersonAreaResponseDto = {
      id: data.id,
      personId: data.person_id,
      person: null,
      scheduledAreaId: data.scheduled_area_id,
      scheduledArea: null,
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

    // Adiciona informações da área agendada se disponível
    if (data.scheduled_area) {
      result.scheduledArea = {
        id: data.scheduled_area.id,
        name: data.scheduled_area.name,
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

