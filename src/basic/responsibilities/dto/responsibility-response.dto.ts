import { ApiProperty } from '@nestjs/swagger';

export class ScheduledAreaDto {
  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'Área de Produção',
  })
  name: string;
}

export class ResponsibilityResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'Responsabilidade de Produção',
  })
  name: string;

  @ApiProperty({
    example: 'Responsável por gerenciar a produção diária',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ID of the scheduled area',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  scheduledAreaId: string;

  @ApiProperty({
    description: 'Scheduled area details (populated when requested)',
    type: ScheduledAreaDto,
    nullable: true,
  })
  scheduledArea: ScheduledAreaDto | null;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: 'URL to the responsibility image (null if no image)',
    example: 'https://example.com/images/responsibility-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  imageUrl: string | null;

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
    example: 50,
  })
  total: number;

  @ApiProperty({
    example: 5,
  })
  totalPages: number;
}

export class PaginatedResponsibilityResponseDto {
  @ApiProperty({
    type: [ResponsibilityResponseDto],
  })
  data: ResponsibilityResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class ImageUploadResponseDto {
  @ApiProperty({
    example: 'Image uploaded successfully',
  })
  message: string;

  @ApiProperty({
    format: 'uri',
    description: 'URL to the uploaded image',
    example: 'https://example.com/images/responsibility-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  responsibilityId: string;
}

