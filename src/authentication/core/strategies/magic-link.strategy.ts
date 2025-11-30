import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import {
  AuthStrategy,
  AuthResult,
  MagicLinkCredentials,
  User,
  Session,
} from '../interfaces/auth.interface';

@Injectable()
export class MagicLinkStrategy implements AuthStrategy {
  constructor(private supabaseService: SupabaseService) {}

  async authenticate(credentials: MagicLinkCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    
    // Envia magic link
    const { data, error } = await client.auth.signInWithOtp({
      email: credentials.email,
      options: {
        emailRedirectTo: credentials.redirectTo,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send magic link');
    }

    // Mock: retorna resultado indicando que o link foi enviado
    // Na implementação real, o usuário clica no link e é redirecionado
    return {
      user: {
        id: 'pending-magic-link-user',
        email: credentials.email,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: null as any,
      accessToken: '',
      refreshToken: '',
    };
  }

  async verifyMagicLink(token: string): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    
    // Mock: verifica token do magic link
    // Na implementação real, isso seria feito via callback
    const { data, error } = await client.auth.getSession();

    if (error || !data?.session) {
      throw new Error('Invalid magic link token');
    }

    return this.mapToAuthResult(data.session);
  }

  async validate(token: string): Promise<User> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      throw new Error('Invalid token');
    }

    return this.mapToUser(data.user);
  }

  private mapToAuthResult(session: any): AuthResult {
    return {
      user: this.mapToUser(session.user),
      session: this.mapToSession(session),
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };
  }

  private mapToUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_confirmed_at !== null,
      phone: user.phone,
      phoneVerified: user.phone_confirmed_at !== null,
      metadata: user.user_metadata,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
    };
  }

  private mapToSession(session: any): Session {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      expiresAt: session.expires_at,
      tokenType: session.token_type,
      user: this.mapToUser(session.user),
    };
  }
}

