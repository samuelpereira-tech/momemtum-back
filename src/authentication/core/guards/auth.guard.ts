import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

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
      const client = this.supabaseService.getClient();
      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Adiciona usuário à requisição
      request.user = data.user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}

