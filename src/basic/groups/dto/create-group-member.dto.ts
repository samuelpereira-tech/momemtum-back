import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateGroupMemberDto {
  @ApiProperty({
    description:
      'ID of the person to add to the group (must be associated with the scheduled area)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({
    description:
      'Array of responsibility IDs (must belong to the scheduled area, can be empty)',
    example: [
      '456e7890-e89b-12d3-a456-426614174001',
      '789e0123-e89b-12d3-a456-426614174002',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  responsibilityIds?: string[];
}







