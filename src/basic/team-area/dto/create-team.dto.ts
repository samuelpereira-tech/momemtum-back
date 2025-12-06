import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTeamRoleDto } from './create-team-role.dto';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Name of the team',
    example: 'Equipe de Plantão A',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of the team (optional)',
    example: 'Equipe responsável pelo plantão noturno',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'ID of the scheduled area this team belongs to',
    format: 'uuid',
    example: 'def67890-e89b-12d3-a456-426614174004',
  })
  @IsUUID()
  scheduledAreaId: string;

  @ApiProperty({
    description:
      'Array of roles (funções) for the team (optional, can be added later)',
    type: [CreateTeamRoleDto],
    required: false,
    default: [],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeamRoleDto)
  @IsOptional()
  roles?: CreateTeamRoleDto[];
}


