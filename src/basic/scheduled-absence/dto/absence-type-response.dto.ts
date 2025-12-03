import { ApiProperty } from '@nestjs/swagger';

export class AbsenceTypeResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the absence type',
    example: 'Férias',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the absence type',
    example: 'Período de férias',
    nullable: true,
    required: false,
  })
  description: string | null;

  @ApiProperty({
    description: 'Hex color code for UI display',
    example: '#79D9C7',
  })
  color: string;

  @ApiProperty({
    description: 'Whether the absence type is active and can be used',
    example: true,
  })
  active: boolean;

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

export class PaginatedAbsenceTypeResponseDto {
  @ApiProperty({
    type: [AbsenceTypeResponseDto],
  })
  data: AbsenceTypeResponseDto[];

  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 15,
  })
  total: number;

  @ApiProperty({
    example: 2,
  })
  totalPages: number;
}

