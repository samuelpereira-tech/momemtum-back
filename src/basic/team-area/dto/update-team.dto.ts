import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTeamRoleDto } from './update-team-role.dto';

export class UpdateTeamDto {
  @ApiProperty({
    description: 'Name of the team',
    example: 'Nome Atualizado',
    minLength: 1,
    maxLength: 255,
    required: false,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Description of the team',
    example: 'Nova descrição',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Array of roles (funções) for the team. When provided, the entire roles array is replaced.',
    type: [UpdateTeamRoleDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTeamRoleDto)
  @IsOptional()
  roles?: UpdateTeamRoleDto[];
}












