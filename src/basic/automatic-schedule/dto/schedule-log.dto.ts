import { ApiProperty } from '@nestjs/swagger';

export enum ScheduleLogChangeType {
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_STATUS_CHANGED = 'member_status_changed',
  MEMBER_PRESENT_CHANGED = 'member_present_changed',
  MEMBER_RESPONSIBILITY_CHANGED = 'member_responsibility_changed',
  SCHEDULE_START_DATE_CHANGED = 'schedule_start_date_changed',
  SCHEDULE_END_DATE_CHANGED = 'schedule_end_date_changed',
  SCHEDULE_STATUS_CHANGED = 'schedule_status_changed',
  TEAM_CHANGED = 'team_changed',
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
}

export class ScheduleLogResponseDto {
  @ApiProperty({
    description: 'Log unique identifier',
    example: 'log-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Schedule ID',
    example: 'schedule-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  scheduleId: string;

  @ApiProperty({
    description: 'Schedule member ID (if applicable)',
    example: 'member-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  scheduleMemberId?: string | null;

  @ApiProperty({
    description: 'Person ID (if applicable)',
    example: 'person-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  personId?: string | null;

  @ApiProperty({
    description: 'Type of change',
    enum: ScheduleLogChangeType,
  })
  changeType: ScheduleLogChangeType;

  @ApiProperty({
    description: 'Old value before the change',
    type: Object,
    nullable: true,
  })
  oldValue?: any;

  @ApiProperty({
    description: 'New value after the change',
    type: Object,
    nullable: true,
  })
  newValue?: any;

  @ApiProperty({
    description: 'ID of the person who made the change',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  changedBy?: string | null;

  @ApiProperty({
    description: 'Person who made the change (if available)',
    type: Object,
    nullable: true,
  })
  changedByPerson?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiProperty({
    description: 'Human-readable message in Portuguese describing the change',
    example: 'Função do membro foi alterada de Professora para Auxiliar',
    nullable: true,
  })
  message?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}

export class PaginatedScheduleLogResponseDto {
  @ApiProperty({
    description: 'Array of schedule logs',
    type: [ScheduleLogResponseDto],
  })
  data: ScheduleLogResponseDto[];

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

