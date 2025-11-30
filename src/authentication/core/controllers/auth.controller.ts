import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import {
  SignInEmailPasswordDto,
  SignUpEmailPasswordDto,
  SignInOAuthDto,
  SignInMagicLinkDto,
  VerifyMagicLinkDto,
  SignInOTPDto,
  VerifyOTPDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from '../dto/auth.dto';
import {
  AuthResultResponseDto,
  MagicLinkSentResponseDto,
  OAuthUrlResponseDto,
  UserResponseDto,
} from '../dto/auth-response.dto';
import type { User } from '../interfaces/auth.interface';
import { OAuthProvider } from '../interfaces/auth.interface';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova conta', description: 'Registra um novo usuário com email e senha' })
  @ApiResponse({
    status: 201,
    description: 'Conta criada com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Rate limit excedido. Aguarde antes de tentar novamente' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async signUp(@Body() signUpDto: SignUpEmailPasswordDto) {
    return this.authService.signUpWithEmailPassword(signUpDto);
  }

  @Public()
  @Post('signin/email-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha', description: 'Autentica um usuário usando email e senha' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 403, description: 'Rate limit excedido. Aguarde antes de tentar novamente' })
  async signInWithEmailPassword(@Body() signInDto: SignInEmailPasswordDto) {
    return this.authService.signInWithEmailPassword(signInDto);
  }

  @Public()
  @Get('signin/oauth')
  @ApiOperation({
    summary: 'Iniciar autenticação OAuth',
    description: 'Redireciona para a página de autorização do provedor OAuth (Google, GitHub, Facebook, Apple)',
  })
  @ApiQuery({
    name: 'provider',
    enum: OAuthProvider,
    description: 'Provedor OAuth',
    example: OAuthProvider.GOOGLE,
  })
  @ApiQuery({
    name: 'redirectUri',
    required: false,
    description: 'URI de redirecionamento após autenticação',
    example: 'http://localhost:3000/callback',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento para página de autorização OAuth',
  })
  @ApiResponse({
    status: 200,
    description: 'URL de autorização (quando não há redirecionamento)',
    type: OAuthUrlResponseDto,
  })
  async signInWithOAuth(
    @Query('provider') provider: OAuthProvider,
    @Query('redirectUri') redirectUri?: string,
    @Res() res?: Response,
  ) {
    const url = await this.authService.signInWithOAuth(provider, redirectUri);
    if (res) {
      return res.redirect(url);
    }
    return { url };
  }

  @Public()
  @Get('signin/oauth/callback')
  @ApiOperation({
    summary: 'Callback OAuth',
    description: 'Processa o callback do provedor OAuth após autorização do usuário',
  })
  @ApiQuery({
    name: 'provider',
    enum: OAuthProvider,
    description: 'Provedor OAuth',
    example: OAuthProvider.GOOGLE,
  })
  @ApiQuery({
    name: 'code',
    description: 'Código de autorização retornado pelo provedor OAuth',
    example: '4/0AeaYSHBw8...',
  })
  @ApiQuery({
    name: 'redirectUri',
    required: false,
    description: 'URI de redirecionamento',
    example: 'http://localhost:3000/callback',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticação OAuth realizada com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Código OAuth inválido ou ausente' })
  async signInWithOAuthCallback(@Query() query: SignInOAuthDto) {
    if (!query.code) {
      throw new Error('OAuth code is required');
    }
    return this.authService.signInWithOAuthCallback({
      provider: query.provider,
      code: query.code,
      redirectUri: query.redirectUri,
    });
  }

  @Public()
  @Post('signin/magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar magic link',
    description: 'Envia um link mágico por email para autenticação sem senha',
  })
  @ApiResponse({
    status: 200,
    description: 'Magic link enviado com sucesso',
    type: MagicLinkSentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Email inválido' })
  @ApiResponse({ status: 403, description: 'Rate limit excedido. Aguarde antes de tentar novamente' })
  async signInWithMagicLink(@Body() magicLinkDto: SignInMagicLinkDto) {
    return this.authService.signInWithMagicLink(magicLinkDto);
  }

  @Public()
  @Post('signin/magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar magic link',
    description: 'Verifica o token do magic link e autentica o usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Magic link verificado com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyMagicLink(@Body() verifyDto: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(verifyDto.token);
  }

  @Public()
  @Post('signin/otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar ou verificar OTP',
    description: 'Se o código não for fornecido, envia OTP por SMS. Se fornecido, verifica e autentica',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP enviado ou verificado com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Telefone inválido ou código incorreto' })
  @ApiResponse({ status: 403, description: 'Rate limit excedido. Aguarde antes de tentar novamente' })
  async signInWithOTP(@Body() otpDto: SignInOTPDto) {
    if (otpDto.code) {
      return this.authService.verifyOTP(otpDto.phone, otpDto.code);
    }
    return this.authService.sendOTP(otpDto.phone);
  }

  @Public()
  @Post('signin/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar código OTP',
    description: 'Verifica o código OTP recebido por SMS e autentica o usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verificado com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Código OTP inválido ou expirado' })
  async verifyOTP(@Body() verifyDto: VerifyOTPDto) {
    return this.authService.verifyOTP(verifyDto.phone, verifyDto.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar token',
    description: 'Renova o access token usando o refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token renovado com sucesso',
    type: AuthResultResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refreshToken(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obter usuário atual',
    description: 'Retorna os dados do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário autenticado',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @UseGuards(AuthGuard)
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout',
    description: 'Encerra a sessão do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Logged out successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async signOut() {
    return this.authService.signOut();
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Alterar senha',
    description: 'Altera a senha do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta ou não autenticado' })
  @ApiResponse({ status: 403, description: 'Rate limit excedido. Aguarde antes de tentar novamente' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully'};
  }
}

