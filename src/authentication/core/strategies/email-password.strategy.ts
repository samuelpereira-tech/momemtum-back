import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import {
  AuthStrategy,
  AuthResult,
  EmailPasswordCredentials,
  User,
  Session,
} from '../interfaces/auth.interface';
import { handleSupabaseError } from '../utils/error-handler.util';

@Injectable()
export class EmailPasswordStrategy implements AuthStrategy {
  constructor(private supabaseService: SupabaseService) {}

  async authenticate(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      handleSupabaseError(error);
    }

    if (!data?.user || !data?.session) {
      throw new Error('Authentication failed: invalid response from Supabase');
    }

    return this.mapToAuthResult(data);
  }

  async signUp(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      handleSupabaseError(error);
    }

    if (!data?.user) {
      throw new Error('Sign up failed: user data not returned');
    }

    // Se não houver sessão (email precisa ser confirmado), retorna apenas o usuário
    if (!data.session) {
      return {
        user: this.mapToUser(data.user),
      };
    }

    return this.mapToAuthResult(data);
  }

  async validate(token: string): Promise<User> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      throw new Error('Invalid token');
    }

    return this.mapToUser(data.user);
  }

  private mapToAuthResult(data: any): AuthResult {
    if (!data.session) {
      throw new Error('Session is required for authentication');
    }

    return {
      user: this.mapToUser(data.user),
      session: this.mapToSession(data.session),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
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

