import { ApiProperty } from '@nestjs/swagger';
import { GenerationConfigurationDto } from './generation-configuration.dto';

export class GroupPreviewDto {
  @ApiProperty({
    description: 'Group ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Grupo A',
  })
  name: string;

  @ApiProperty({
    description: 'Members of the group (populated when requested)',
    type: Array,
    required: false,
  })
  members?: MemberPreviewDto[];
}

export class MemberPreviewDto {
  @ApiProperty({
    description: 'Person ID',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  personId: string;

  @ApiProperty({
    description: 'Person name',
    example: 'João Silva',
  })
  personName: string;

  @ApiProperty({
    description: 'Person photo URL',
    example: 'https://example.com/photos/joao.jpg',
    nullable: true,
  })
  personPhotoUrl?: string | null;

  @ApiProperty({
    description: 'Responsibilities of the person',
    type: Array,
  })
  responsibilities: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
  }>;
}

export class TeamPreviewDto {
  @ApiProperty({
    description: 'Team ID',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Equipe de Música',
  })
  name: string;
}

export class AssignmentPreviewDto {
  @ApiProperty({
    description: 'Person ID (empty string if not assigned)',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  personId: string;

  @ApiProperty({
    description: "Person name ('[Não atribuído]' if not assigned)",
    example: 'João Silva',
  })
  personName: string;

  @ApiProperty({
    description: 'Role ID',
    example: 'role-123e4567-e89b-12d3-a456-426614174004',
    format: 'uuid',
  })
  roleId: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Baterista',
  })
  roleName: string;
}

export class SchedulePreviewDto {
  @ApiProperty({
    description: 'Temporary ID for preview (not a real schedule ID)',
    example: 'preview-1',
  })
  id: string;

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
    description: 'Groups assigned to this schedule (for group generation type)',
    type: [GroupPreviewDto],
    required: false,
  })
  groups?: GroupPreviewDto[];

  @ApiProperty({
    description: 'Team assigned to this schedule (for team generation types)',
    type: TeamPreviewDto,
    required: false,
  })
  team?: TeamPreviewDto;

  @ApiProperty({
    description: 'Person-role assignments (for team generation types)',
    type: [AssignmentPreviewDto],
    required: false,
  })
  assignments?: AssignmentPreviewDto[];

  @ApiProperty({
    description:
      'Array of warning messages (e.g., consecutive repetitions, unbalanced distribution)',
    type: [String],
  })
  warnings: string[];

  @ApiProperty({
    description:
      'Array of error messages (e.g., absent people, missing responsibilities, unassigned roles)',
    type: [String],
  })
  errors: string[];
}

export class GenerationSummaryDto {
  @ApiProperty({
    description: 'Total number of schedules that will be created',
    example: 20,
  })
  totalSchedules: number;

  @ApiProperty({
    description: 'Total number of unique participants across all schedules',
    example: 15,
  })
  totalParticipants: number;

  @ApiProperty({
    description: 'Total number of warnings',
    example: 2,
  })
  warnings: number;

  @ApiProperty({
    description: 'Total number of errors',
    example: 0,
  })
  errors: number;

  @ApiProperty({
    description:
      "Distribution balance status: 'balanced' (good distribution), 'unbalanced' (some issues), 'critical' (many issues)",
    enum: ['balanced', 'unbalanced', 'critical'],
  })
  distributionBalance: string;
}

export class GenerationPreviewDto {
  @ApiProperty({
    description: 'Configuration used for generation',
    type: GenerationConfigurationDto,
  })
  configuration: GenerationConfigurationDto;

  @ApiProperty({
    description: 'Array of preview schedules that will be created',
    type: [SchedulePreviewDto],
  })
  schedules: SchedulePreviewDto[];

  @ApiProperty({
    description: 'Summary of the generation',
    type: GenerationSummaryDto,
  })
  summary: GenerationSummaryDto;
}



