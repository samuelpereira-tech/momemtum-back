import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../shared/infra/database/supabase/supabase.service';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import {
  PersonResponseDto,
  PhotoUploadResponseDto,
  PaginatedPersonResponseDto,
} from '../dto/person-response.dto';
import { handleSupabaseError } from '../../authentication/core/utils/error-handler.util';
import { MulterFile } from '../interfaces/file.interface';

@Injectable()
export class PersonService {
  private readonly tableName = 'persons';

  constructor(private supabaseService: SupabaseService) {}

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

    // Busca os registros paginados
    const { data, error } = await supabaseClient
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })
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

    const updateData: any = {};
    if (updatePersonDto.fullName !== undefined)
      updateData.full_name = updatePersonDto.fullName;
    if (updatePersonDto.email !== undefined) updateData.email = updatePersonDto.email;
    if (updatePersonDto.phone !== undefined) updateData.phone = updatePersonDto.phone;
    if (updatePersonDto.cpf !== undefined) updateData.cpf = updatePersonDto.cpf;
    if (updatePersonDto.birthDate !== undefined)
      updateData.birth_date = updatePersonDto.birthDate;
    if (updatePersonDto.emergencyContact !== undefined)
      updateData.emergency_contact = updatePersonDto.emergencyContact;
    if (updatePersonDto.address !== undefined)
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
      handleSupabaseError(error);
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

