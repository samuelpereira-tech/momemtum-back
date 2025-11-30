import { IsEmail, IsString, IsOptional, IsEnum, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OAuthProvider } from '../interfaces/auth.interface';

export class SignInEmailPasswordDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  password: string;
}

export class SignUpEmailPasswordDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  password: string;
}

export class SignInOAuthDto {
  @ApiProperty({
    description: 'Provedor OAuth',
    enum: OAuthProvider,
    example: OAuthProvider.GOOGLE,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiPropertyOptional({
    description: 'Código de autorização OAuth (retornado pelo provedor)',
    example: '4/0AeaYSHBw8...',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'URI de redirecionamento após autenticação',
    example: 'http://localhost:3000/callback',
  })
  @IsString()
  @IsOptional()
  redirectUri?: string;
}

export class SignInMagicLinkDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'URL de redirecionamento após clicar no magic link',
    example: 'http://localhost:3000/callback',
  })
  @IsString()
  @IsOptional()
  redirectTo?: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({
    description: 'Token do magic link recebido por email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;
}

export class SignInOTPDto {
  @ApiProperty({
    description: 'Número de telefone do usuário',
    example: '+5511999999999',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiPropertyOptional({
    description: 'Código OTP recebido por SMS (opcional, se não fornecido, será enviado)',
    example: '123456',
  })
  @IsString()
  @IsOptional()
  code?: string;
}

export class VerifyOTPDto {
  @ApiProperty({
    description: 'Número de telefone do usuário',
    example: '+5511999999999',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'Código OTP recebido por SMS',
    example: '123456',
  })
  @IsString()
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token para renovar a sessão',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'currentPassword123',
    minLength: 6,
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'newPassword123',
    minLength: 6,
  })
  @IsString()
  newPassword: string;
}

