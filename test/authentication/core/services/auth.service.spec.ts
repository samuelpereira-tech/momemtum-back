import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/authentication/core/services/auth.service';
import { EmailPasswordStrategy } from 'src/authentication/core/strategies/email-password.strategy';
import { OAuthStrategy } from 'src/authentication/core/strategies/oauth.strategy';
import { MagicLinkStrategy } from 'src/authentication/core/strategies/magic-link.strategy';
import { OTPStrategy } from 'src/authentication/core/strategies/otp.strategy';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { OAuthProvider } from 'src/authentication/core/interfaces/auth.interface';

describe('AuthService', () => {
  let service: AuthService;
  let emailPasswordStrategy: EmailPasswordStrategy;
  let oauthStrategy: OAuthStrategy;
  let magicLinkStrategy: MagicLinkStrategy;
  let otpStrategy: OTPStrategy;
  let supabaseService: SupabaseService;

  const mockEmailPasswordStrategy = {
    authenticate: jest.fn(),
    signUp: jest.fn(),
  };

  const mockOAuthStrategy = {
    authenticate: jest.fn(),
    getAuthorizationUrl: jest.fn(),
  };

  const mockMagicLinkStrategy = {
    authenticate: jest.fn(),
    verifyMagicLink: jest.fn(),
  };

  const mockOTPStrategy = {
    authenticate: jest.fn(),
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmailPasswordStrategy,
          useValue: mockEmailPasswordStrategy,
        },
        {
          provide: OAuthStrategy,
          useValue: mockOAuthStrategy,
        },
        {
          provide: MagicLinkStrategy,
          useValue: mockMagicLinkStrategy,
        },
        {
          provide: OTPStrategy,
          useValue: mockOTPStrategy,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    emailPasswordStrategy = module.get<EmailPasswordStrategy>(
      EmailPasswordStrategy,
    );
    oauthStrategy = module.get<OAuthStrategy>(OAuthStrategy);
    magicLinkStrategy = module.get<MagicLinkStrategy>(MagicLinkStrategy);
    otpStrategy = module.get<OTPStrategy>(OTPStrategy);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signInWithEmailPassword', () => {
    it('should call email password strategy', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: { id: 'user-id', email: credentials.email },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockEmailPasswordStrategy.authenticate.mockResolvedValue(expectedResult);

      const result = await service.signInWithEmailPassword(credentials);

      expect(mockEmailPasswordStrategy.authenticate).toHaveBeenCalledWith(
        credentials,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signUpWithEmailPassword', () => {
    it('should call email password strategy signUp', async () => {
      const credentials = {
        email: 'new@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: { id: 'user-id', email: credentials.email },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockEmailPasswordStrategy.signUp.mockResolvedValue(expectedResult);

      const result = await service.signUpWithEmailPassword(credentials);

      expect(mockEmailPasswordStrategy.signUp).toHaveBeenCalledWith(
        credentials,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signInWithOAuth', () => {
    it('should get authorization URL', async () => {
      const provider = OAuthProvider.GOOGLE;
      const redirectUri = 'http://localhost:3000/callback';
      const expectedUrl = 'https://oauth.provider.com/authorize';

      mockOAuthStrategy.getAuthorizationUrl.mockResolvedValue(expectedUrl);

      const result = await service.signInWithOAuth(provider, redirectUri);

      expect(mockOAuthStrategy.getAuthorizationUrl).toHaveBeenCalledWith(
        provider,
        redirectUri,
      );
      expect(result).toBe(expectedUrl);
    });
  });

  describe('signInWithMagicLink', () => {
    it('should call magic link strategy', async () => {
      const credentials = {
        email: 'test@example.com',
        redirectTo: 'http://localhost:3000/callback',
      };

      const expectedResult = {
        user: { id: 'user-id', email: credentials.email },
        session: {},
        accessToken: '',
        refreshToken: '',
      };

      mockMagicLinkStrategy.authenticate.mockResolvedValue(expectedResult);

      const result = await service.signInWithMagicLink(credentials);

      expect(mockMagicLinkStrategy.authenticate).toHaveBeenCalledWith(
        credentials,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signInWithOTP', () => {
    it('should send OTP when code is not provided', async () => {
      const credentials = {
        phone: '+5511999999999',
      };

      const expectedResult = {
        user: { id: 'user-id', phone: credentials.phone },
        session: {},
        accessToken: '',
        refreshToken: '',
      };

      mockOTPStrategy.sendOTP.mockResolvedValue(expectedResult);

      const result = await service.sendOTP(credentials.phone);

      expect(mockOTPStrategy.sendOTP).toHaveBeenCalledWith(credentials);
      expect(result).toEqual(expectedResult);
    });

    it('should verify OTP when code is provided', async () => {
      const phone = '+5511999999999';
      const code = '123456';

      const expectedResult = {
        user: { id: 'user-id', phone },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockOTPStrategy.verifyOTP.mockResolvedValue(expectedResult);

      const result = await service.verifyOTP(phone, code);

      expect(mockOTPStrategy.verifyOTP).toHaveBeenCalledWith({ phone, code });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'refresh-token';
      const mockClient = {
        auth: {
          refreshSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
                expires_in: 3600,
                expires_at: Date.now() + 3600000,
                token_type: 'bearer',
                user: {
                  id: 'user-id',
                  email: 'test@example.com',
                  email_confirmed_at: '2024-01-01T00:00:00Z',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
              },
            },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.refreshToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(service.signOut()).resolves.not.toThrow();
    });
  });
});

