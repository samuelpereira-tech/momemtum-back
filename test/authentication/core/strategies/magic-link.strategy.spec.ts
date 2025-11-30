import { Test, TestingModule } from '@nestjs/testing';
import { MagicLinkStrategy } from 'src/authentication/core/strategies/magic-link.strategy';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { MagicLinkCredentials } from 'src/authentication/core/interfaces/auth.interface';

describe('MagicLinkStrategy', () => {
  let strategy: MagicLinkStrategy;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MagicLinkStrategy,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    strategy = module.get<MagicLinkStrategy>(MagicLinkStrategy);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('authenticate', () => {
    it('should send magic link successfully', async () => {
      const credentials: MagicLinkCredentials = {
        email: 'test@example.com',
        redirectTo: 'http://localhost:3000/callback',
      };

      const mockClient = {
        auth: {
          signInWithOtp: jest.fn().mockResolvedValue({
            data: { message: 'Magic link sent successfully' },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await strategy.authenticate(credentials);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
    });
  });

  describe('verifyMagicLink', () => {
    it('should verify magic link token', async () => {
      const token = 'magic-link-token';

      const mockClient = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
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

      const result = await strategy.verifyMagicLink(token);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
    });
  });
});

