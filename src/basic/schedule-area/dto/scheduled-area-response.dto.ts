import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ResponsiblePersonDto {
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
    description: 'URL to the responsible person photo',
    example: 'https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  photoUrl: string | null;
}

export class ScheduledAreaResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'Área de Produção',
  })
  name: string;

  @ApiProperty({
    example: 'Setor responsável pela produção',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ID of the responsible person',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  responsiblePersonId: string;

  @ApiProperty({
    description: 'Responsible person details (populated when requested)',
    type: ResponsiblePersonDto,
    nullable: true,
  })
  responsiblePerson: ResponsiblePersonDto | null;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the scheduled area image (null if no image uploaded)',
    example: 'https://example.com/images/area-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  imageUrl: string | null;

  @ApiProperty({
    description: 'Whether the area is marked as favorite',
    example: false,
  })
  favorite: boolean;

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

export class ImageUploadResponseDto {
  @ApiProperty({
    example: 'Image uploaded successfully',
  })
  message: string;

  @ApiProperty({
    format: 'uri',
    description: 'URL to the uploaded image',
    example: 'https://example.com/images/area-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  scheduledAreaId: string;
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
    example: 50,
  })
  total: number;

  @ApiProperty({
    example: 5,
  })
  totalPages: number;
}

export class PaginatedScheduledAreaResponseDto {
  @ApiProperty({
    type: [ScheduledAreaResponseDto],
  })
  data: ScheduledAreaResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class ToggleFavoriteDto {
  @ApiProperty({
    description: 'Favorite status (true to add to favorites, false to remove)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  favorite: boolean;
}

