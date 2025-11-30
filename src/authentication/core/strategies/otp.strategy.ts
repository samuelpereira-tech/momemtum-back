import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import {
  AuthStrategy,
  AuthResult,
  OTPCredentials,
  User,
  Session,
} from '../interfaces/auth.interface';
import { handleSupabaseError } from '../utils/error-handler.util';

@Injectable()
export class OTPStrategy implements AuthStrategy {
  constructor(private supabaseService: SupabaseService) {}

  async authenticate(credentials: OTPCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();

    if (credentials.code) {
      // Verifica código OTP
      return this.verifyOTP(credentials);
    } else {
      // Envia código OTP
      return this.sendOTP(credentials);
    }
  }

  async sendOTP(credentials: OTPCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client.auth.signInWithOtp({
      phone: credentials.phone,
    });

    if (error) {
      handleSupabaseError(error);
    }

    // Retorna resultado indicando que o código foi enviado
    return {
      user: {
        id: 'pending-otp-user',
        email: '',
        emailVerified: false,
        phone: credentials.phone,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: null,
    };
  }

  async verifyOTP(credentials: OTPCredentials): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    
    const { data, error } = await client.auth.verifyOtp({
      phone: credentials.phone,
      token: credentials.code!,
      type: 'sms',
    });

    if (error) {
      handleSupabaseError(error);
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
    if (!data?.user) {
      throw new Error('User data is required');
    }

    if (!data?.session) {
      throw new Error('Session is required for OTP verification');
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
      email: user.email || '',
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

