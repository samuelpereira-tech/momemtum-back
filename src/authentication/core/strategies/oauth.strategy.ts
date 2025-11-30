import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import {
  AuthStrategy,
  AuthResult,
  OAuthCredentials,
  OAuthProvider,
  User,
  Session,
} from '../interfaces/auth.interface';

@Injectable()
export class OAuthStrategy implements AuthStrategy {
  constructor(private supabaseService: SupabaseService) {}

  async authenticate(credentials: OAuthCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    
    // Mock: Simula callback OAuth
    // Na implementação real, isso seria feito via callback URL
    const { data, error } = await client.auth.signInWithOAuth({
      provider: credentials.provider,
      options: {
        redirectTo: credentials.redirectUri,
      },
    });

    if (error) {
      throw new Error(error.message || 'OAuth authentication failed');
    }

    // Mock: retorna resultado simulado
    return this.createMockAuthResult(credentials.provider);
  }

  async getAuthorizationUrl(provider: OAuthProvider, redirectUri: string): Promise<string> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to get authorization URL');
    }

    return data.url;
  }

  async validate(token: string): Promise<User> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      throw new Error('Invalid token');
    }

    return this.mapToUser(data.user);
  }

  private createMockAuthResult(provider: OAuthProvider): AuthResult {
    return {
      user: {
        id: `oauth-user-${provider}`,
        email: `user@${provider}.com`,
        emailVerified: true,
        metadata: { provider },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: {
        accessToken: `mock-oauth-token-${provider}`,
        refreshToken: `mock-oauth-refresh-${provider}`,
        expiresIn: 3600,
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
        user: {
          id: `oauth-user-${provider}`,
          email: `user@${provider}.com`,
          emailVerified: true,
          metadata: { provider },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      accessToken: `mock-oauth-token-${provider}`,
      refreshToken: `mock-oauth-refresh-${provider}`,
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
}

