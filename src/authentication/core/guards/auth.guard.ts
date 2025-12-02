import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    return this.validateToken(token, request);
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async validateToken(token: string, request: any): Promise<boolean> {
    try {
      // Cria um cliente Supabase temporário com o token para validar
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new UnauthorizedException('Supabase configuration missing');
      }

      // Cria um cliente temporário e define o token no header global
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      // Valida o token chamando getUser() - o Supabase validará o token do header
      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Adiciona usuário à requisição
      request.user = data.user;
      return true;
    } catch (error: any) {
      // Se já for uma UnauthorizedException, re-lança
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}

