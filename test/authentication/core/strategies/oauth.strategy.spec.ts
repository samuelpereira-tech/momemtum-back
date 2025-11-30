import { Test, TestingModule } from '@nestjs/testing';
import { OAuthStrategy } from 'src/authentication/core/strategies/oauth.strategy';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { OAuthCredentials, OAuthProvider } from 'src/authentication/core/interfaces/auth.interface';

describe('OAuthStrategy', () => {
  let strategy: OAuthStrategy;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthStrategy,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    strategy = module.get<OAuthStrategy>(OAuthStrategy);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('authenticate', () => {
    it('should authenticate user with OAuth', async () => {
      const credentials: OAuthCredentials = {
        provider: OAuthProvider.GOOGLE,
        code: 'oauth-code',
      };

      const mockClient = {
        auth: {
          signInWithOAuth: jest.fn().mockResolvedValue({
            data: { url: 'https://oauth.provider.com/authorize' },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await strategy.authenticate(credentials);

      expect(result).toBeDefined();
      expect(result.user.email).toContain(credentials.provider);
      expect(result.accessToken).toContain('oauth');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return authorization URL for provider', async () => {
      const provider = OAuthProvider.GITHUB;
      const redirectUri = 'http://localhost:3000/callback';

      const mockClient = {
        auth: {
          signInWithOAuth: jest.fn().mockResolvedValue({
            data: {
              url: `https://oauth.provider.com/authorize?provider=${provider}`,
            },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const url = await strategy.getAuthorizationUrl(provider, redirectUri);

      expect(url).toBeDefined();
      expect(url).toContain(provider);
    });
  });
});

