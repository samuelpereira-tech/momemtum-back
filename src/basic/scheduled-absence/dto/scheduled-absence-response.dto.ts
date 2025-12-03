import { ApiProperty } from '@nestjs/swagger';

class PersonInfoDto {
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
}

class AbsenceTypeInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    example: 'Férias',
  })
  name: string;

  @ApiProperty({
    example: '#79D9C7',
  })
  color: string;
}

export class ScheduledAbsenceResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the person',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  personId: string;

  @ApiProperty({
    description: 'Person information (populated when requested)',
    type: PersonInfoDto,
    required: false,
  })
  person?: PersonInfoDto;

  @ApiProperty({
    description: 'ID of the absence type',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  absenceTypeId: string;

  @ApiProperty({
    description: 'Absence type information (populated when requested)',
    type: AbsenceTypeInfoDto,
    required: false,
  })
  absenceType?: AbsenceTypeInfoDto;

  @ApiProperty({
    description: 'Start date of the absence',
    example: '2024-12-20',
    format: 'date',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date of the absence',
    example: '2025-01-10',
    format: 'date',
  })
  endDate: string;

  @ApiProperty({
    description: 'Description or notes about the absence',
    example: 'Férias de fim de ano',
    nullable: true,
    required: false,
  })
  description: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'Creation timestamp',
    example: '2024-12-01T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Last update timestamp',
    example: '2024-12-01T10:30:00.000Z',
  })
  updatedAt: string;
}

export class PaginatedScheduledAbsenceResponseDto {
  @ApiProperty({
    type: [ScheduledAbsenceResponseDto],
  })
  data: ScheduledAbsenceResponseDto[];

  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 50,
  })
  total: number;

  @ApiProperty({
    example: 5,
  })
  totalPages: number;
}

