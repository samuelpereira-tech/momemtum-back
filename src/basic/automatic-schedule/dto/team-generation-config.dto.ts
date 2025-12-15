import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateIf,
} from 'class-validator';

export enum ParticipantSelection {
  ALL = 'all',
  BY_GROUP = 'by_group',
  INDIVIDUAL = 'individual',
  ALL_WITH_EXCLUSIONS = 'all_with_exclusions',
}

export class TeamGenerationConfigDto {
  @ApiProperty({
    description: 'Team ID to use in generation',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @ApiProperty({
    description:
      "Participant selection mode: 'all' (all people in area), 'by_group' (filter by groups), 'individual' (manual selection), 'all_with_exclusions' (all except excluded)",
    enum: ParticipantSelection,
    example: ParticipantSelection.ALL,
  })
  @IsEnum(ParticipantSelection)
  @IsNotEmpty()
  participantSelection: ParticipantSelection;

  @ApiProperty({
    description:
      'Array of group IDs (required when participantSelection is "by_group")',
    example: [],
    type: [String],
    required: false,
  })
  @ValidateIf((o) => o.participantSelection === ParticipantSelection.BY_GROUP)
  @IsArray()
  @IsUUID(undefined, { each: true })
  selectedGroupIds?: string[];

  @ApiProperty({
    description:
      'Array of person IDs (required when participantSelection is "individual")',
    example: [],
    type: [String],
    required: false,
  })
  @ValidateIf((o) => o.participantSelection === ParticipantSelection.INDIVIDUAL)
  @IsArray()
  @IsUUID(undefined, { each: true })
  selectedPersonIds?: string[];

  @ApiProperty({
    description:
      'Array of person IDs to exclude (used when participantSelection is "all_with_exclusions")',
    example: [],
    type: [String],
    required: false,
  })
  @ValidateIf(
    (o) => o.participantSelection === ParticipantSelection.ALL_WITH_EXCLUSIONS,
  )
  @IsArray()
  @IsUUID(undefined, { each: true })
  excludedPersonIds?: string[];

  @ApiProperty({
    description: 'Whether to consider absences when selecting people',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  considerAbsences: boolean;

  @ApiProperty({
    description:
      'Whether to require responsibilities (only people with matching responsibilities can be assigned to roles)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  requireResponsibilities: boolean;

  @ApiProperty({
    description:
      'When enabled, if there are not enough people to fill all roles, available people will be repeated to fill remaining slots',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  repeatPersonsWhenInsufficient?: boolean;
}








