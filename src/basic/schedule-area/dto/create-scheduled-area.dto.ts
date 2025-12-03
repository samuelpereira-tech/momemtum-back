import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateScheduledAreaDto {
  @ApiProperty({
    description: 'Name of the scheduled area',
    example: 'Área de Produção',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of the scheduled area (optional)',
    example: 'Setor responsável pela produção',
    maxLength: 1000,
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'ID of the responsible person (must exist)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  responsiblePersonId: string;

  @ApiProperty({
    description: 'Whether the area is marked as favorite',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  favorite?: boolean;
}

