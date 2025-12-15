import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateScheduleCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Observação importante sobre esta escala',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class UpdateScheduleCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Observação atualizada',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class ScheduleCommentResponseDto {
  @ApiProperty({
    description: 'Comment unique identifier',
    example: 'comment-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Comment content',
    example: 'Observação importante sobre esta escala',
  })
  content: string;

  @ApiProperty({
    description: 'Author ID',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  authorId: string;

  @ApiProperty({
    description: 'Author name',
    example: 'João Silva',
  })
  authorName: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T11:00:00.000Z',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T11:00:00.000Z',
    format: 'date-time',
  })
  updatedAt: string;
}







