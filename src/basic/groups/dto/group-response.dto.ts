import { ApiProperty } from '@nestjs/swagger';
import { GroupMemberResponseDto } from './group-member-response.dto';

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

export class GroupResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the group',
    format: 'uuid',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    example: 'Equipe de Plantão A',
  })
  name: string;

  @ApiProperty({
    example: 'Grupo responsável pelo plantão noturno',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ID of the scheduled area this group belongs to',
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
    description: 'Number of members in the group',
    example: 5,
  })
  membersCount: number;

  @ApiProperty({
    description: 'Array of group members (populated when requested)',
    type: [GroupMemberResponseDto],
  })
  members: GroupMemberResponseDto[];

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

export class PaginatedGroupResponseDto {
  @ApiProperty({
    type: [GroupResponseDto],
  })
  data: GroupResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}













