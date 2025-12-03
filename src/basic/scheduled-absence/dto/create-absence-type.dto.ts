import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsBoolean,
} from 'class-validator';

export class CreateAbsenceTypeDto {
  @ApiProperty({
    description: 'Name of the absence type (e.g., Férias, Feriado, Licença)',
    example: 'Férias',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Optional description of the absence type',
    example: 'Período de férias',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Hex color code for UI display (format: #RRGGBB)',
    example: '#79D9C7',
    pattern: '^#[0-9A-Fa-f]{6}$',
    default: '#AD82D9',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (format: #RRGGBB)',
  })
  color?: string;

  @ApiProperty({
    description: 'Whether the absence type is active and can be used',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

