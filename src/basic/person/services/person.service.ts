import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import {
  PersonResponseDto,
  PhotoUploadResponseDto,
  PaginatedPersonResponseDto,
} from '../dto/person-response.dto';
import { PersonAvailabilityResponseDto } from '../dto/person-availability-response.dto';
import {
  handleSupabaseError,
  handleSupabaseErrorWithDetails,
} from '../../../authentication/core/utils/error-handler.util';
import { MulterFile } from '../interfaces/file.interface';

@Injectable()
export class PersonService {
  private readonly tableName = 'persons';

  constructor(private supabaseService: SupabaseService) { }

  async create(createPersonDto: CreatePersonDto): Promise<PersonResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se email já existe (apenas se fornecido)
    if (createPersonDto.email) {
      const { data: existingEmail } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('email', createPersonDto.email)
        .single();

      if (existingEmail) {
        throw new ConflictException('Person with this email already exists');
      }
    }

    // Verifica se CPF já existe (apenas se fornecido)
    if (createPersonDto.cpf) {
      const { data: existingCpf } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('cpf', createPersonDto.cpf)
        .single();

      if (existingCpf) {
        throw new ConflictException('Person with this CPF already exists');
      }
    }

    // Helper para verificar se um valor é válido (não undefined, null ou string vazia)
    const isValidValue = (value: any): boolean => {
      return value !== undefined && value !== null && value !== '';
    };

    // Monta o objeto de inserção apenas com os campos fornecidos e não vazios
    const insertData: any = {
      full_name: createPersonDto.fullName,
    };

    if (isValidValue(createPersonDto.email)) {
      insertData.email = createPersonDto.email;
    }
    if (isValidValue(createPersonDto.phone)) {
      insertData.phone = createPersonDto.phone;
    }
    if (isValidValue(createPersonDto.cpf)) {
      insertData.cpf = createPersonDto.cpf;
    }
    if (isValidValue(createPersonDto.birthDate)) {
      insertData.birth_date = createPersonDto.birthDate;
    }
    if (isValidValue(createPersonDto.emergencyContact)) {
      insertData.emergency_contact = createPersonDto.emergencyContact;
    }
    if (isValidValue(createPersonDto.address)) {
      insertData.address = createPersonDto.address;
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
  ): Promise<PaginatedPersonResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Validação de parâmetros
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    // Busca total de registros
    const { count, error: countError } = await supabaseClient
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      handleSupabaseError(countError);
    }

    // Busca os registros paginados ordenados por nome
    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .order('full_name', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      handleSupabaseError(error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    return {
      data: data.map((item: any) => this.mapToResponseDto(item)),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    };
  }

  async findOne(id: string): Promise<PersonResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Person not found');
      }
      handleSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundException('Person not found');
    }

    return this.mapToResponseDto(data);
  }

  async update(
    id: string,
    updatePersonDto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a pessoa existe
    await this.findOne(id);

    // Verifica se email já existe (se estiver sendo atualizado)
    if (updatePersonDto.email) {
      const { data: existingEmail } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('email', updatePersonDto.email)
        .neq('id', id)
        .single();

      if (existingEmail) {
        throw new ConflictException('Person with this email already exists');
      }
    }

    // Verifica se CPF já existe (se estiver sendo atualizado)
    if (updatePersonDto.cpf) {
      const { data: existingCpf } = await supabaseClient
        .from(this.tableName)
        .select('id')
        .eq('cpf', updatePersonDto.cpf)
        .neq('id', id)
        .single();

      if (existingCpf) {
        throw new ConflictException('Person with this CPF already exists');
      }
    }

    // Helper para verificar se um valor é válido (não undefined, null ou string vazia)
    const isValidValue = (value: any): boolean => {
      return value !== undefined && value !== null && value !== '';
    };

    const updateData: any = {};
    if (isValidValue(updatePersonDto.fullName))
      updateData.full_name = updatePersonDto.fullName;
    if (isValidValue(updatePersonDto.email))
      updateData.email = updatePersonDto.email;
    if (isValidValue(updatePersonDto.phone))
      updateData.phone = updatePersonDto.phone;
    if (isValidValue(updatePersonDto.cpf))
      updateData.cpf = updatePersonDto.cpf;
    if (isValidValue(updatePersonDto.birthDate))
      updateData.birth_date = updatePersonDto.birthDate;
    if (isValidValue(updatePersonDto.emergencyContact))
      updateData.emergency_contact = updatePersonDto.emergencyContact;
    if (isValidValue(updatePersonDto.address))
      updateData.address = updatePersonDto.address;

    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a pessoa existe
    await this.findOne(id);

    const { error } = await supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      await handleSupabaseErrorWithDetails(error, supabaseClient, id, this.tableName);
    }
  }

  async uploadPhoto(
    id: string,
    file: MulterFile,
    token?: string,
  ): Promise<PhotoUploadResponseDto> {
    // Cria um cliente Supabase com o token do usuário autenticado para passar pelas políticas RLS
    const supabaseClient = token
      ? this.supabaseService.getClientWithToken(token)
      : this.supabaseService.getRawClient();

    // Verifica se a pessoa existe
    await this.findOne(id);

    // Valida o arquivo
    if (!file) {
      throw new BadRequestException('Photo file is required');
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
    const fileName = `person-${id}.${fileExt}`;
    const filePath = `persons/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('person-photos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(`Failed to upload photo: ${uploadError.message}`);
    }

    // Obtém a URL pública da foto
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from('person-photos').getPublicUrl(filePath);

    // Atualiza a URL da foto na tabela
    const { data, error } = await supabaseClient
      .from(this.tableName)
      .update({ photo_url: publicUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error);
    }

    return {
      message: 'Photo uploaded successfully',
      photoUrl: publicUrl,
      personId: id,
    };
  }

  async deletePhoto(id: string, token?: string): Promise<void> {
    // Cria um cliente Supabase com o token do usuário autenticado para passar pelas políticas RLS
    const supabaseClient = token
      ? this.supabaseService.getClientWithToken(token)
      : this.supabaseService.getRawClient();

    // Verifica se a pessoa existe e tem foto
    const person = await this.findOne(id);

    if (!person.photoUrl) {
      throw new NotFoundException('Photo does not exist');
    }

    // Extrai o nome do arquivo da URL
    const urlParts = person.photoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `persons/${fileName}`;

    // Remove do storage
    const { error: deleteError } = await supabaseClient.storage
      .from('person-photos')
      .remove([filePath]);

    if (deleteError) {
      // Se não conseguir deletar do storage, apenas remove a referência
      console.warn(`Failed to delete photo from storage: ${deleteError.message}`);
    }

    // Remove a referência da foto na tabela
    const { error } = await supabaseClient
      .from(this.tableName)
      .update({ photo_url: null })
      .eq('id', id);

    if (error) {
      handleSupabaseError(error);
    }
  }

  async getAvailability(
    personId: string,
    startDate: string,
    endDate: string,
  ): Promise<PersonAvailabilityResponseDto> {
    const supabaseClient = this.supabaseService.getRawClient();

    // Verifica se a pessoa existe
    const person = await this.findOne(personId);

    // Valida o período
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (start > end) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    // Buscar IDs de escalas onde a pessoa está como membro (schedule_members)
    const { data: scheduleMemberIds, error: scheduleMembersError } = await supabaseClient
      .from('schedule_members')
      .select('schedule_id')
      .eq('person_id', personId);

    if (scheduleMembersError) {
      handleSupabaseError(scheduleMembersError);
    }

    // Combinar todos os IDs de escalas únicos
    const allScheduleIds = new Set<string>();
    if (scheduleMemberIds) {
      scheduleMemberIds.forEach((item: any) => allScheduleIds.add(item.schedule_id));
    }

    // Buscar todas as escalas de uma vez
    let schedules: any[] = [];
    if (allScheduleIds.size > 0) {
      const scheduleIdsArray = Array.from(allScheduleIds);
      const { data: schedulesData, error: schedulesError } = await supabaseClient
        .from('schedules')
        .select('start_datetime, end_datetime, status')
        .in('id', scheduleIdsArray)
        .neq('status', 'cancelled');

      if (schedulesError) {
        handleSupabaseError(schedulesError);
      }

      schedules = schedulesData || [];
    }

    // Buscar ausências programadas que se sobrepõem ao período
    // Uma ausência se sobrepõe se: start_date <= endDate AND end_date >= startDate
    const { data: absences, error: absencesError } = await supabaseClient
      .from('scheduled_absences')
      .select('start_date, end_date')
      .eq('person_id', personId)
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (absencesError) {
      handleSupabaseError(absencesError);
    }

    // Normalizar período para início/fim do dia para comparação
    const periodStartDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const periodEndDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Extrair datas das escalas
    const scheduledDatesSet = new Set<string>();

    // Processar todas as escalas
    for (const schedule of schedules) {
      if (schedule) {
        const scheduleStart = new Date(schedule.start_datetime);
        const scheduleEnd = new Date(schedule.end_datetime);

        // Normalizar para início do dia para comparação
        const scheduleStartDate = new Date(scheduleStart.getFullYear(), scheduleStart.getMonth(), scheduleStart.getDate());
        const scheduleEndDate = new Date(scheduleEnd.getFullYear(), scheduleEnd.getMonth(), scheduleEnd.getDate());

        // Verificar se a escala se sobrepõe ao período consultado
        if (scheduleEndDate >= periodStartDate && scheduleStartDate <= periodEndDate) {
          // Extrair todas as datas da escala que estão no período
          const overlapStart = scheduleStartDate > periodStartDate ? scheduleStartDate : periodStartDate;
          const overlapEnd = scheduleEndDate < periodEndDate ? scheduleEndDate : periodEndDate;

          const currentDate = new Date(overlapStart);
          while (currentDate <= overlapEnd) {
            scheduledDatesSet.add(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }
    }

    // Extrair datas das ausências
    const absentDatesSet = new Set<string>();

    if (absences) {
      for (const absence of absences) {
        const absenceStart = new Date(absence.start_date + 'T00:00:00.000Z');
        const absenceEnd = new Date(absence.end_date + 'T23:59:59.999Z');

        // Normalizar para início do dia para comparação
        const absenceStartDate = new Date(absenceStart.getFullYear(), absenceStart.getMonth(), absenceStart.getDate());
        const absenceEndDate = new Date(absenceEnd.getFullYear(), absenceEnd.getMonth(), absenceEnd.getDate());

        // Verificar se a ausência se sobrepõe ao período consultado
        if (absenceEndDate >= periodStartDate && absenceStartDate <= periodEndDate) {
          // Extrair todas as datas da ausência que estão no período
          const overlapStart = absenceStartDate > periodStartDate ? absenceStartDate : periodStartDate;
          const overlapEnd = absenceEndDate < periodEndDate ? absenceEndDate : periodEndDate;

          const currentDate = new Date(overlapStart);
          while (currentDate <= overlapEnd) {
            absentDatesSet.add(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }
    }

    // Converter sets para arrays ordenados
    const scheduledDates = Array.from(scheduledDatesSet).sort();
    const absentDates = Array.from(absentDatesSet).sort();

    // Combinar todas as datas ocupadas (escaladas ou ausentes)
    const allOccupiedDatesSet = new Set([...scheduledDatesSet, ...absentDatesSet]);
    const allOccupiedDates = Array.from(allOccupiedDatesSet).sort();

    return {
      personId: person.id,
      personName: person.fullName,
      startDate,
      endDate,
      scheduledDates,
      absentDates,
      allOccupiedDates,
    };
  }

  private mapToResponseDto(data: any): PersonResponseDto {
    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birthDate: data.birth_date,
      emergencyContact: data.emergency_contact,
      address: data.address,
      photoUrl: data.photo_url || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

