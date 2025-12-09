import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsEnum, IsBoolean, ValidateIf } from 'class-validator';

export enum MemberStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class CreateScheduleMemberDto {
  @ApiProperty({
    description: 'Person ID to add to the schedule',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({
    description: 'Responsibility ID for this member',
    example: 'resp-1',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  responsibilityId: string;
}

export class UpdateScheduleMemberDto {
  @ApiProperty({
    description: 'New responsibility ID',
    example: 'resp-2',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  responsibilityId?: string;

  @ApiProperty({
    description: 'Member status',
    enum: MemberStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiProperty({
    description: 'Whether the person was present',
    example: true,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.present !== null && o.present !== undefined)
  @IsBoolean()
  present?: boolean | null;
}

export class ScheduleMemberResponseDto {
  @ApiProperty({
    description: 'Schedule member unique identifier',
    example: 'member-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Person ID',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  personId: string;

  @ApiProperty({
    description: 'Person information',
    type: Object,
    nullable: true,
  })
  person?: {
    id: string;
    fullName: string;
    email: string;
    photoUrl?: string | null;
  } | null;

  @ApiProperty({
    description: 'Responsibility ID',
    example: 'resp-1',
    format: 'uuid',
  })
  responsibilityId: string;

  @ApiProperty({
    description: 'Responsibility information',
    type: Object,
    nullable: true,
  })
  responsibility?: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
  } | null;

  @ApiProperty({
    description: 'Member status',
    enum: MemberStatus,
  })
  status: MemberStatus;

  @ApiProperty({
    description: 'Whether the person was present',
    example: true,
    nullable: true,
  })
  present: boolean | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}



