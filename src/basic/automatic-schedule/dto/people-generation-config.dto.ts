import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class PeopleGenerationConfigDto {
  @ApiProperty({
    description: 'Whether to consider absences when selecting people',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  considerAbsences: boolean;

  @ApiProperty({
    description:
      'Array of person IDs to exclude (all other people in the area are included by default)',
    example: [],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  excludedPersonIds?: string[];
}








