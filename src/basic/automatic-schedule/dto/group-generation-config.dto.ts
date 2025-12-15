import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';

export enum DistributionOrder {
  SEQUENTIAL = 'sequential',
  RANDOM = 'random',
  BALANCED = 'balanced',
}

export class GroupGenerationConfigDto {
  @ApiProperty({
    description: 'Array of group IDs to use in generation (min 1)',
    example: ['456e7890-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  groupIds: string[];

  @ApiProperty({
    description: 'Number of groups to assign per schedule (min 1)',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  groupsPerSchedule: number;

  @ApiProperty({
    description:
      "Distribution order: 'sequential' (fixed order), 'random' (random order), 'balanced' (balanced distribution avoiding repetitions)",
    enum: DistributionOrder,
    example: DistributionOrder.BALANCED,
  })
  @IsEnum(DistributionOrder)
  @IsNotEmpty()
  distributionOrder: DistributionOrder;

  @ApiProperty({
    description:
      'Whether to consider absences when selecting groups (groups with absent members will be excluded)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  considerAbsences: boolean;

  @ApiProperty({
    description:
      'Array of person IDs to exclude from groups (even if they are group members)',
    example: [],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  excludedPersonIds?: string[];
}








