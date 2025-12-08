import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsString,
  Min,
  Matches,
  ArrayMinSize,
  MinLength,
  MaxLength,
} from 'class-validator';

export class PeriodConfigDto {
  @ApiProperty({
    description:
      'Base date/time for the first schedule (used for fixed, weekly, monthly, daily)',
    example: '2025-01-01T08:00:00.000Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  baseDateTime?: string;

  @ApiProperty({
    description:
      'Duration of each schedule in days (for weekly, monthly) or hours (for fixed)',
    example: 7,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiProperty({
    description: 'Interval between schedules in days (for weekly period type, default: 7)',
    example: 7,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @ApiProperty({
    description:
      'Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday) for daily period type',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  weekdays?: number[];

  @ApiProperty({
    description: 'Start time in HH:mm format (for daily period type)',
    example: '08:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ApiProperty({
    description: 'End time in HH:mm format (for daily period type)',
    example: '17:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Array of dates to exclude from generation (useful for holidays)',
    example: ['2025-01-15'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedDates?: string[];

  @ApiProperty({
    description:
      'Array of specific dates to include even if they don\'t match the pattern (useful for special days)',
    example: [],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedDates?: string[];
}



