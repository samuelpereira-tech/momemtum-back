import { ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';

/**
 * Verifica se o erro é de rate limiting do Supabase
 */
export function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message || '';
  return errorMessage.includes('For security purposes') || 
         errorMessage.includes('rate limit') ||
         errorMessage.includes('too many requests');
}

/**
 * Converte erros do Supabase em exceções HTTP apropriadas
 */
export function handleSupabaseError(error: any): never {
  if (!error) {
    throw new BadRequestException('An error occurred');
  }

  const errorMessage = error.message || 'An error occurred';

  // Rate limiting - 403 Forbidden
  if (isRateLimitError(error)) {
    throw new ForbiddenException(errorMessage);
  }

  // Erros de autenticação - 401 Unauthorized
  if (
    errorMessage.includes('Invalid credentials') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Invalid password') ||
    errorMessage.includes('User not found')
  ) {
    throw new UnauthorizedException(errorMessage);
  }

  // Erros de validação - 400 Bad Request
  if (
    errorMessage.includes('Email already registered') ||
    errorMessage.includes('User already registered') ||
    errorMessage.includes('Invalid email') ||
    errorMessage.includes('Invalid phone')
  ) {
    throw new BadRequestException(errorMessage);
  }

  // Outros erros - 400 Bad Request
  throw new BadRequestException(errorMessage);
}

