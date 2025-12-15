import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateResponsibilityDto {
  @ApiProperty({
    description: 'Name of the responsibility',
    example: 'Responsabilidade de Produção',
    minLength: 3,
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Description of the responsibility',
    example: 'Responsável por gerenciar a produção diária',
    maxLength: 1000,
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'ID of the scheduled area (must exist)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  scheduledAreaId?: string;

  @ApiProperty({
    description: 'URL of the responsibility image',
    example: 'https://example.com/images/responsibility.jpg',
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  imageUrl?: string;
}


















