import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class UpdateGroupMemberDto {
  @ApiProperty({
    description:
      'Array of responsibility IDs (must belong to the scheduled area, can be empty)',
    example: [
      '456e7890-e89b-12d3-a456-426614174001',
      '012e3456-e89b-12d3-a456-426614174005',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  responsibilityIds?: string[];
}







