import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class PersonAvailabilityQueryDto {
  @ApiProperty({
    description: 'Data de início do período (formato: YYYY-MM-DD)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Data de fim do período (formato: YYYY-MM-DD)',
    example: '2024-01-31',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}


