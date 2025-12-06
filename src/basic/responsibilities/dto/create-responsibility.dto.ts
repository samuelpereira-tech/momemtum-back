import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResponsibilityDto {
  @ApiProperty({
    description: 'Name of the responsibility',
    example: 'Responsabilidade de Produção',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of the responsibility (optional)',
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
  })
  @IsUUID()
  @IsNotEmpty()
  scheduledAreaId: string;

  @ApiProperty({
    description: 'URL of the responsibility image (optional)',
    example: 'https://example.com/images/responsibility.jpg',
    required: false,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsOptional()
  imageUrl?: string;
}







