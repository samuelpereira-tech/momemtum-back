import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { GenerationConfigurationDto } from './generation-configuration.dto';

export enum ScheduleType {
  GROUP = 'group',
  TEAM = 'team',
  INDIVIDUAL = 'individual',
}

export enum ScheduleStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class ScheduleGenerationResponseDto {
  @ApiProperty({
    description: 'Schedule generation unique identifier',
    example: 'gen-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Scheduled area unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Type of generation',
    enum: ['group', 'people', 'team_without_restriction', 'team_with_restriction'],
  })
  generationType: string;

  @ApiProperty({
    description: 'Type of period',
    enum: ['fixed', 'monthly', 'weekly', 'daily'],
  })
  periodType: string;

  @ApiProperty({
    description: 'Start date of the generation period',
    example: '2025-01-01',
    format: 'date',
  })
  periodStartDate: string;

  @ApiProperty({
    description: 'End date of the generation period',
    example: '2025-01-31',
    format: 'date',
  })
  periodEndDate: string;

  @ApiProperty({
    description: 'Full configuration used for generation (JSON object)',
    type: GenerationConfigurationDto,
  })
  configuration: GenerationConfigurationDto;

  @ApiProperty({
    description: 'Total number of schedules created',
    example: 20,
  })
  totalSchedulesGenerated: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'ID of the person who created the generation',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
    nullable: true,
  })
  createdBy?: string | null;

  @ApiProperty({
    description: 'Created schedules with full details (including group members)',
    type: Array,
    required: false,
  })
  schedules?: Array<any>;
}

export class PaginatedScheduleGenerationResponseDto {
  @ApiProperty({
    description: 'Array of schedule generations',
    type: [ScheduleGenerationResponseDto],
  })
  data: ScheduleGenerationResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: Object,
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ScheduleResponseDto {
  @ApiProperty({
    description: 'Schedule unique identifier',
    example: 'schedule-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the schedule generation (null for manual schedules)',
    example: 'gen-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  scheduleGenerationId?: string | null;

  @ApiProperty({
    description: 'Scheduled area unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Start date/time of the schedule',
    example: '2025-01-01T08:00:00.000Z',
    format: 'date-time',
  })
  startDatetime: string;

  @ApiProperty({
    description: 'End date/time of the schedule',
    example: '2025-01-01T17:00:00.000Z',
    format: 'date-time',
  })
  endDatetime: string;

  @ApiProperty({
    description: 'Type of schedule',
    enum: ScheduleType,
  })
  scheduleType: ScheduleType;

  @ApiProperty({
    description: 'Status of the schedule',
    enum: ScheduleStatus,
  })
  status: ScheduleStatus;

  @ApiProperty({
    description: 'Number of participants in the schedule',
    example: 5,
  })
  participantsCount: number;

  @ApiProperty({
    description: 'List of participants with id, name and imageUrl',
    type: Array,
    required: false,
  })
  participants?: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
  }>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Logs of changes to schedule and members',
    type: Array,
    required: false,
  })
  logs?: Array<{
    id: string;
    changeType: string;
    oldValue?: any;
    newValue?: any;
    changedBy?: string | null;
    message?: string | null;
    createdAt: string;
  }>;
}

export class PaginatedScheduleResponseDto {
  @ApiProperty({
    description: 'Array of schedules',
    type: [ScheduleResponseDto],
  })
  data: ScheduleResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: Object,
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Scheduled area unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Start date/time of the schedule',
    example: '2025-01-01T08:00:00.000Z',
    format: 'date-time',
  })
  startDatetime: string;

  @ApiProperty({
    description: 'End date/time of the schedule',
    example: '2025-01-01T17:00:00.000Z',
    format: 'date-time',
  })
  endDatetime: string;

  @ApiProperty({
    description:
      "Type of schedule: 'group' (assigned to groups), 'team' (assigned to team with roles), 'individual' (assigned to individual people)",
    enum: ScheduleType,
  })
  scheduleType: ScheduleType;

  @ApiProperty({
    description: 'Array of group IDs (required when scheduleType is "group")',
    example: ['456e7890-e89b-12d3-a456-426614174001'],
    type: [String],
    required: false,
  })
  groupIds?: string[];

  @ApiProperty({
    description: 'Team ID (required when scheduleType is "team")',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
    required: false,
  })
  teamId?: string;

  @ApiProperty({
    description:
      'Array of person-role assignments (required when scheduleType is "team")',
    type: Array,
    required: false,
  })
  assignments?: Array<{
    personId: string;
    teamRoleId: string;
  }>;

  @ApiProperty({
    description: 'Array of person IDs (required when scheduleType is "individual")',
    example: [],
    type: [String],
    required: false,
  })
  memberIds?: string[];
}

export class UpdateScheduleDto {
  @ApiProperty({
    description: 'Start date/time (only for manual schedules)',
    example: '2025-01-01T09:00:00.000Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDatetime?: string;

  @ApiProperty({
    description: 'End date/time (only for manual schedules)',
    example: '2025-01-01T18:00:00.000Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDatetime?: string;

  @ApiProperty({
    description: 'Status of the schedule',
    enum: ScheduleStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}

export class ScheduleDetailsResponseDto extends ScheduleResponseDto {
  @ApiProperty({
    description: 'Groups assigned to this schedule',
    type: Array,
    required: false,
  })
  groups?: Array<{
    id: string;
    name: string;
  }>;

  @ApiProperty({
    description: 'Team assigned to this schedule',
    type: Object,
    required: false,
    nullable: true,
  })
  team?: {
    id: string;
    name: string;
  } | null;

  @ApiProperty({
    description: 'Team role assignments',
    type: Array,
    required: false,
  })
  assignments?: Array<any>;

  @ApiProperty({
    description: 'Schedule members',
    type: Array,
    required: false,
  })
  members?: Array<any>;

  @ApiProperty({
    description: 'Schedule comments',
    type: Array,
    required: false,
  })
  comments?: Array<any>;
}

