import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
} from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({
    description: 'Full name of the person',
    example: 'John Doe',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    description: 'Email address (must be unique)',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Mobile phone number (10-11 digits, without formatting)',
    example: '11987654321',
    pattern: '^[0-9]{10,11}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Phone must be 10-11 digits without formatting',
  })
  phone: string;

  @ApiProperty({
    description: 'CPF number (11 digits, without formatting, must be unique)',
    example: '12345678901',
    pattern: '^[0-9]{11}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{11}$/, {
    message: 'CPF must be exactly 11 digits without formatting',
  })
  cpf: string;

  @ApiProperty({
    description: 'Date of birth in ISO 8601 format (YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({
    description: 'Emergency contact phone number (10-11 digits, without formatting)',
    example: '11987654322',
    pattern: '^[0-9]{10,11}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Emergency contact must be 10-11 digits without formatting',
  })
  emergencyContact: string;

  @ApiProperty({
    description: 'Full address including street, number, complement, neighborhood, city, state, and ZIP code',
    example: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  address: string;
}

