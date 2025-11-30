export enum AuthMethod {
  EMAIL_PASSWORD = 'email_password',
  OAUTH = 'oauth',
  MAGIC_LINK = 'magic_link',
  OTP = 'otp',
}

export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}

export interface AuthResult {
  user: User;
  session?: Session | null;
  accessToken?: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
  user: User;
}

export interface AuthStrategy {
  authenticate(credentials: any): Promise<AuthResult>;
  validate(token: string): Promise<User>;
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export interface OAuthCredentials {
  provider: OAuthProvider;
  code: string;
  redirectUri?: string;
}

export interface MagicLinkCredentials {
  email: string;
  redirectTo?: string;
}

export interface OTPCredentials {
  phone: string;
  code?: string;
}

