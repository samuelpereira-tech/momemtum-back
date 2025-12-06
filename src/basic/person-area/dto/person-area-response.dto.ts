import { ApiProperty } from '@nestjs/swagger';

export class PersonInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'João Silva',
  })
  fullName: string;

  @ApiProperty({
    format: 'email',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the person photo',
    example: 'https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  photoUrl: string | null;
}

export class ScheduledAreaDto {
  @ApiProperty({
    format: 'uuid',
    example: 'def67890-e89b-12d3-a456-426614174004',
  })
  id: string;

  @ApiProperty({
    example: 'Área de Produção',
  })
  name: string;
}

export class ResponsibilityInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    example: 'Operador',
  })
  name: string;

  @ApiProperty({
    example: 'Responsável por operar equipamentos',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the responsibility image',
    example: 'https://example.com/images/responsibility-456e7890-e89b-12d3-a456-426614174001.jpg',
  })
  imageUrl: string | null;
}

export class PersonAreaResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the person-area association',
    format: 'uuid',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the associated person',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  personId: string;

  @ApiProperty({
    description: 'Person information (populated when requested)',
    type: PersonInfoDto,
    nullable: true,
  })
  person: PersonInfoDto | null;

  @ApiProperty({
    description: 'ID of the scheduled area',
    format: 'uuid',
    example: 'def67890-e89b-12d3-a456-426614174004',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Scheduled area information (populated when requested)',
    type: ScheduledAreaDto,
    nullable: true,
  })
  scheduledArea: ScheduledAreaDto | null;

  @ApiProperty({
    description: 'Array of responsibilities assigned to the person in this area',
    type: [ResponsibilityInfoDto],
  })
  responsibilities: ResponsibilityInfoDto[];

  @ApiProperty({
    format: 'date-time',
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

export class PaginationMetaDto {
  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 25,
  })
  total: number;

  @ApiProperty({
    example: 3,
  })
  totalPages: number;
}

export class PaginatedPersonAreaResponseDto {
  @ApiProperty({
    type: [PersonAreaResponseDto],
  })
  data: PersonAreaResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}









