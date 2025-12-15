import { ApiProperty } from '@nestjs/swagger';

export class PersonAvailabilityResponseDto {
  @ApiProperty({
    description: 'ID da pessoa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  personId: string;

  @ApiProperty({
    description: 'Nome completo da pessoa',
    example: 'João Silva',
  })
  personName: string;

  @ApiProperty({
    description: 'Data de início do período consultado',
    example: '2024-01-01',
    format: 'date',
  })
  startDate: string;

  @ApiProperty({
    description: 'Data de fim do período consultado',
    example: '2024-01-31',
    format: 'date',
  })
  endDate: string;

  @ApiProperty({
    description: 'Lista de datas onde a pessoa está escalada (formato: YYYY-MM-DD)',
    type: [String],
    example: ['2024-01-05', '2024-01-10', '2024-01-15'],
  })
  scheduledDates: string[];

  @ApiProperty({
    description: 'Lista de datas onde a pessoa está ausente (formato: YYYY-MM-DD)',
    type: [String],
    example: ['2024-01-08', '2024-01-12'],
  })
  absentDates: string[];

  @ApiProperty({
    description: 'Lista de todas as datas do período onde a pessoa está escalada ou ausente (formato: YYYY-MM-DD)',
    type: [String],
    example: ['2024-01-05', '2024-01-08', '2024-01-10', '2024-01-12', '2024-01-15'],
  })
  allOccupiedDates: string[];
}



