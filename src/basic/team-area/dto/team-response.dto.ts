import { ApiProperty } from '@nestjs/swagger';

export class ScheduledAreaDto {
  @ApiProperty({
    format: 'uuid',
    example: 'def67890-e89b-12d3-a456-426614174004',
  })
  id: string;

  @ApiProperty({
    example: 'Área de Produção',
  })
  name: string;
}

export class TeamRoleDto {
  @ApiProperty({
    description: 'Unique identifier for the team role',
    format: 'uuid',
    example: 'role-12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the responsibility (função)',
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  responsibilityId: string;

  @ApiProperty({
    description: 'Name of the responsibility (função) - populated by the server',
    example: 'Líder',
  })
  responsibilityName: string;

  @ApiProperty({
    description: 'Number of people needed for this role',
    example: 3,
  })
  quantity: number;

  @ApiProperty({
    description: 'Priority of this role (lower number = higher priority)',
    example: 1,
  })
  priority: number;

  @ApiProperty({
    description:
      'If true, the role is free to be assigned to any person. If false, specific fixed persons are assigned.',
    example: false,
  })
  isFree: boolean;

  @ApiProperty({
    description:
      'Array of person IDs assigned as fixed to this role (empty if isFree is true)',
    type: [String],
    format: 'uuid',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '234e5678-e89b-12d3-a456-426614174001',
    ],
  })
  fixedPersonIds: string[];
}

export class TeamResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the team',
    format: 'uuid',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    example: 'Equipe de Plantão A',
  })
  name: string;

  @ApiProperty({
    example: 'Equipe responsável pelo plantão noturno',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ID of the scheduled area this team belongs to',
    format: 'uuid',
    example: 'def67890-e89b-12d3-a456-426614174004',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Scheduled area information (populated when requested)',
    type: ScheduledAreaDto,
    nullable: true,
  })
  scheduledArea: ScheduledAreaDto | null;

  @ApiProperty({
    description: 'Array of roles (funções) in the team',
    type: [TeamRoleDto],
  })
  roles: TeamRoleDto[];

  @ApiProperty({
    format: 'date-time',
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

export class PaginationMetaDto {
  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 15,
  })
  total: number;

  @ApiProperty({
    example: 2,
  })
  totalPages: number;
}

export class PaginatedTeamResponseDto {
  @ApiProperty({
    type: [TeamResponseDto],
  })
  data: TeamResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}











