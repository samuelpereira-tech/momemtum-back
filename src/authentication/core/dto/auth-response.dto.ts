import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Email do usuário', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'Indica se o email foi verificado', example: true })
  emailVerified: boolean;

  @ApiPropertyOptional({ description: 'Telefone do usuário', example: '+5511999999999' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Indica se o telefone foi verificado', example: false })
  phoneVerified?: boolean;

  @ApiPropertyOptional({ description: 'Metadados adicionais do usuário', example: {} })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class SessionResponseDto {
  @ApiProperty({ description: 'Access token JWT', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ description: 'Tempo de expiração em segundos', example: 3600 })
  expiresIn: number;

  @ApiProperty({ description: 'Timestamp de expiração', example: 1704067200 })
  expiresAt: number;

  @ApiProperty({ description: 'Tipo do token', example: 'bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Dados do usuário', type: UserResponseDto })
  user: UserResponseDto;
}

export class AuthResultResponseDto {
  @ApiProperty({ description: 'Dados do usuário autenticado', type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ description: 'Dados da sessão', type: SessionResponseDto })
  session: SessionResponseDto;

  @ApiProperty({ description: 'Access token JWT', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}

export class MagicLinkSentResponseDto {
  @ApiProperty({ description: 'Mensagem de confirmação', example: 'Magic link sent successfully' })
  message: string;

  @ApiProperty({ description: 'Email para onde o link foi enviado', example: 'user@example.com' })
  email: string;
}

export class OAuthUrlResponseDto {
  @ApiProperty({ description: 'URL de autorização OAuth', example: 'https://accounts.google.com/o/oauth2/v2/auth?...' })
  url: string;
}

