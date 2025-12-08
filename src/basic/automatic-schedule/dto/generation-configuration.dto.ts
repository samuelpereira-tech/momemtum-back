import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GroupGenerationConfigDto } from './group-generation-config.dto';
import { PeopleGenerationConfigDto } from './people-generation-config.dto';
import { TeamGenerationConfigDto } from './team-generation-config.dto';
import { PeriodConfigDto } from './period-config.dto';

export enum GenerationType {
  GROUP = 'group',
  PEOPLE = 'people',
  TEAM_WITHOUT_RESTRICTION = 'team_without_restriction',
  TEAM_WITH_RESTRICTION = 'team_with_restriction',
}

export enum PeriodType {
  FIXED = 'fixed',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
}

export class GenerationConfigurationDto {
  @ApiProperty({
    description: 'Scheduled area where schedules will be generated',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  scheduledAreaId: string;

  @ApiProperty({
    description:
      "Type of generation: 'group' (by groups), 'people' (by people), 'team_without_restriction' (team without responsibility validation), 'team_with_restriction' (team with responsibility validation)",
    enum: GenerationType,
    example: GenerationType.GROUP,
  })
  @IsEnum(GenerationType)
  @IsNotEmpty()
  generationType: GenerationType;

  @ApiProperty({
    description:
      "Type of period: 'fixed' (single schedule), 'monthly' (repeats monthly), 'weekly' (repeats weekly), 'daily' (repeats daily with restrictions)",
    enum: PeriodType,
    example: PeriodType.DAILY,
  })
  @IsEnum(PeriodType)
  @IsNotEmpty()
  periodType: PeriodType;

  @ApiProperty({
    description: 'Start date of the generation period',
    example: '2025-01-01',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  periodStartDate: string;

  @ApiProperty({
    description: 'End date of the generation period',
    example: '2025-01-31',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  periodEndDate: string;

  @ApiProperty({
    description: 'Group generation configuration (required when generationType is "group")',
    type: GroupGenerationConfigDto,
    required: false,
  })
  @ValidateIf((o) => o.generationType === GenerationType.GROUP)
  @ValidateNested()
  @Type(() => GroupGenerationConfigDto)
  @IsObject()
  groupConfig?: GroupGenerationConfigDto;

  @ApiProperty({
    description: 'People generation configuration (required when generationType is "people")',
    type: PeopleGenerationConfigDto,
    required: false,
  })
  @ValidateIf((o) => o.generationType === GenerationType.PEOPLE)
  @ValidateNested()
  @Type(() => PeopleGenerationConfigDto)
  @IsObject()
  peopleConfig?: PeopleGenerationConfigDto;

  @ApiProperty({
    description:
      'Team generation configuration (required when generationType is "team_without_restriction" or "team_with_restriction")',
    type: TeamGenerationConfigDto,
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.generationType === GenerationType.TEAM_WITHOUT_RESTRICTION ||
      o.generationType === GenerationType.TEAM_WITH_RESTRICTION,
  )
  @ValidateNested()
  @Type(() => TeamGenerationConfigDto)
  @IsObject()
  teamConfig?: TeamGenerationConfigDto;

  @ApiProperty({
    description: 'Period-specific configuration',
    type: PeriodConfigDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => PeriodConfigDto)
  @IsOptional()
  @IsObject()
  periodConfig?: PeriodConfigDto;
}

