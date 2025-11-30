import { Injectable } from '@nestjs/common';
import { EmailPasswordStrategy } from '../strategies/email-password.strategy';
import { OAuthStrategy } from '../strategies/oauth.strategy';
import { MagicLinkStrategy } from '../strategies/magic-link.strategy';
import { OTPStrategy } from '../strategies/otp.strategy';
import { SupabaseService } from '../../../shared/infra/database/supabase/supabase.service';
import {
  AuthMethod,
  AuthResult,
  EmailPasswordCredentials,
  OAuthCredentials,
  MagicLinkCredentials,
  OTPCredentials,
  OAuthProvider,
  User,
  Session,
} from '../interfaces/auth.interface';
import { handleSupabaseError } from '../utils/error-handler.util';

@Injectable()
export class AuthService {
  constructor(
    private emailPasswordStrategy: EmailPasswordStrategy,
    private oauthStrategy: OAuthStrategy,
    private magicLinkStrategy: MagicLinkStrategy,
    private otpStrategy: OTPStrategy,
    private supabaseService: SupabaseService,
  ) {}

  async signInWithEmailPassword(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    return this.emailPasswordStrategy.authenticate(credentials);
  }

  async signUpWithEmailPassword(credentials: EmailPasswordCredentials): Promise<AuthResult> {
    return this.emailPasswordStrategy.signUp(credentials);
  }

  async signInWithOAuth(provider: OAuthProvider, redirectUri?: string): Promise<string> {
    return this.oauthStrategy.getAuthorizationUrl(provider, redirectUri || '');
  }

  async signInWithOAuthCallback(credentials: OAuthCredentials): Promise<AuthResult> {
    return this.oauthStrategy.authenticate(credentials);
  }

  async signInWithMagicLink(credentials: MagicLinkCredentials): Promise<AuthResult> {
    return this.magicLinkStrategy.authenticate(credentials);
  }

  async verifyMagicLink(token: string): Promise<AuthResult> {
    return this.magicLinkStrategy.verifyMagicLink(token);
  }

  async signInWithOTP(credentials: OTPCredentials): Promise<AuthResult> {
    return this.otpStrategy.authenticate(credentials);
  }

  async sendOTP(phone: string): Promise<AuthResult> {
    return this.otpStrategy.sendOTP({ phone });
  }

  async verifyOTP(phone: string, code: string): Promise<AuthResult> {
    return this.otpStrategy.verifyOTP({ phone, code });
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.refreshSession(refreshToken);

    if (error) {
      handleSupabaseError(error);
    }

    return this.mapToAuthResult(data.session);
  }

  async signOut(): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.signOut();

    if (error) {
      handleSupabaseError(error);
    }
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

