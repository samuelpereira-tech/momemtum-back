import { ApiProperty } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    format: 'email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    example: '11987654321',
  })
  phone: string;

  @ApiProperty({
    example: '12345678901',
  })
  cpf: string;

  @ApiProperty({
    format: 'date',
    example: '1990-01-15',
  })
  birthDate: string;

  @ApiProperty({
    example: '11987654322',
  })
  emergencyContact: string;

  @ApiProperty({
    example: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
  })
  address: string;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    description: "URL to the person's photo (null if no photo uploaded)",
    example: 'https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  photoUrl: string | null;

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

export class PhotoUploadResponseDto {
  @ApiProperty({
    example: 'Photo uploaded successfully',
  })
  message: string;

  @ApiProperty({
    format: 'uri',
    description: 'URL to the uploaded photo',
    example: 'https://example.com/photos/person-123e4567-e89b-12d3-a456-426614174000.jpg',
  })
  photoUrl: string;

  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  personId: string;
}

export class PaginatedPersonResponseDto {
  @ApiProperty({
    type: [PersonResponseDto],
  })
  data: PersonResponseDto[];

  @ApiProperty({
    example: 1,
  })
  page: number;

  @ApiProperty({
    example: 10,
  })
  limit: number;

  @ApiProperty({
    example: 100,
  })
  total: number;

  @ApiProperty({
    example: 10,
  })
  totalPages: number;
}

