import { ApiProperty } from '@nestjs/swagger';

export class PersonInScheduleDto {
  @ApiProperty({
    description: 'Nome completo da pessoa',
    example: 'João Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'URL da foto da pessoa',
    example: 'https://example.com/photos/person-123.jpg',
    nullable: true,
  })
  url: string | null;

  @ApiProperty({
    description: 'Nome da função/responsabilidade da pessoa',
    example: 'Médico',
  })
  função: string;

  @ApiProperty({
    description: 'Indica se a pessoa esteve presente',
    example: true,
    nullable: true,
  })
  present: boolean | null;

  @ApiProperty({
    description: 'Status do membro na escala',
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
    description: 'Lista de pessoas na escala',
    type: [PersonInScheduleDto],
  })
  pessoas: PersonInScheduleDto[];
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

