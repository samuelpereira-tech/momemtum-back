import { ApiProperty } from '@nestjs/swagger';

export class PersonInScheduleDto {
  @ApiProperty({
    description: 'Full name of the person',
    example: 'João Silva',
  })
  name: string;

  @ApiProperty({
    description: 'URL of the person photo',
    example: 'https://example.com/photos/person-123.jpg',
    nullable: true,
  })
  url: string | null;

  @ApiProperty({
    description: 'Name of the role/responsibility of the person',
    example: 'Médico',
  })
  role: string;

  @ApiProperty({
    description: 'Indicates if the person was present',
    example: true,
    nullable: true,
  })
  present: boolean | null;

  @ApiProperty({
    description: 'Status of the member in the schedule',
    enum: ['pending', 'accepted', 'rejected'],
    example: 'accepted',
  })
  status: string;
}

export class ScheduleOptimizedResponseDto {
  @ApiProperty({
    description: 'ID único da escala',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Data e hora de início da escala',
    example: '2024-01-01T08:00:00.000Z',
    format: 'date-time',
  })
  startDatetime: string;

  @ApiProperty({
    description: 'Data e hora de fim da escala',
    example: '2024-01-01T17:00:00.000Z',
    format: 'date-time',
  })
  endDatetime: string;

  @ApiProperty({
    description: 'List of people in the schedule',
    type: [PersonInScheduleDto],
  })
  people: PersonInScheduleDto[];

  @ApiProperty({
    description: 'List of groups associated with the schedule',
    type: Array,
    example: [{ id: 'uuid', name: 'Grupo A' }],
  })
  groups: Array<{ id: string; name: string }>;
}

export class PaginatedScheduleOptimizedResponseDto {
  @ApiProperty({
    description: 'Array de escalas otimizadas',
    type: [ScheduleOptimizedResponseDto],
  })
  data: ScheduleOptimizedResponseDto[];

  @ApiProperty({
    description: 'Metadados de paginação',
    type: Object,
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

