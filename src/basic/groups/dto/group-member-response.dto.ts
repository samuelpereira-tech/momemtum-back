import { ApiProperty } from '@nestjs/swagger';

export class PersonInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'João Silva',
  })
  fullName: string;

  @ApiProperty({
    format: 'email',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the person photo',
    example: 'https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  photoUrl: string | null;
}

export class GroupInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    example: 'Equipe de Plantão A',
  })
  name: string;
}

export class ResponsibilityInfoDto {
  @ApiProperty({
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    example: 'Líder',
  })
  name: string;

  @ApiProperty({
    example: 'Lidera a equipe',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the responsibility image',
    example: 'https://example.com/images/responsibility-456e7890-e89b-12d3-a456-426614174001.jpg',
  })
  imageUrl: string | null;
}

export class GroupMemberResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the group member association',
    format: 'uuid',
    example: 'xyz98765-e89b-12d3-a456-426614174005',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the associated person',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  personId: string;

  @ApiProperty({
    description: 'Person information (populated when requested)',
    type: PersonInfoDto,
    nullable: true,
  })
  person: PersonInfoDto | null;

  @ApiProperty({
    description: 'ID of the group',
    format: 'uuid',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  groupId: string;

  @ApiProperty({
    description: 'Group information (populated when requested)',
    type: GroupInfoDto,
    nullable: true,
  })
  group: GroupInfoDto | null;

  @ApiProperty({
    description: 'Array of responsibilities assigned to the person in this group',
    type: [ResponsibilityInfoDto],
  })
  responsibilities: ResponsibilityInfoDto[];

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
    example: 25,
  })
  total: number;

  @ApiProperty({
    example: 3,
  })
  totalPages: number;
}

export class PaginatedGroupMemberResponseDto {
  @ApiProperty({
    type: [GroupMemberResponseDto],
  })
  data: GroupMemberResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}













