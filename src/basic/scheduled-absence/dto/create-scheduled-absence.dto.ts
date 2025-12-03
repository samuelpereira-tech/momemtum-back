import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateScheduledAbsenceDto {
  @ApiProperty({
    description: 'ID of the person who will be absent',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({
    description: 'ID of the absence type (e.g., Férias, Feriado, Licença)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  absenceTypeId: string;

  @ApiProperty({
    description: 'Start date of the absence in ISO 8601 format (YYYY-MM-DD)',
    example: '2024-12-20',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of the absence in ISO 8601 format (YYYY-MM-DD). Must be greater than or equal to startDate',
    example: '2025-01-10',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Optional description or notes about the absence',
    example: 'Férias de fim de ano',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

