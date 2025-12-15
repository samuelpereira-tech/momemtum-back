import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateIf,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTeamRoleDto {
  @ApiProperty({
    description:
      'ID of the role (required when updating existing role, omit when adding new role)',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'ID of the responsibility (função) - must belong to the scheduled area',
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  responsibilityId: string;

  @ApiProperty({
    description: 'Number of people needed for this role',
    minimum: 1,
    example: 3,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    description:
      'Priority of this role (lower number = higher priority). Must be unique within the team (excluding the role being updated).',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  priority: number;

  @ApiProperty({
    description:
      'If true, the role is free to be assigned to any person. If false, specific fixed persons must be assigned.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiProperty({
    description:
      'Array of person IDs assigned as fixed to this role. Required if isFree is false. All persons must be associated with the scheduled area. The number of fixed persons cannot exceed the quantity.',
    type: [String],
    format: 'uuid',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '234e5678-e89b-12d3-a456-426614174001',
    ],
    required: false,
  })
  @ValidateIf((o) => o.isFree === false)
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMinSize(1, {
    message: 'At least one person must be assigned when isFree is false',
  })
  @IsOptional()
  fixedPersonIds?: string[];
}











