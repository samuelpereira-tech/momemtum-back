import { Test, TestingModule } from '@nestjs/testing';
import { EmailPasswordStrategy } from 'src/authentication/core/strategies/email-password.strategy';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { EmailPasswordCredentials } from 'src/authentication/core/interfaces/auth.interface';

describe('EmailPasswordStrategy', () => {
  let strategy: EmailPasswordStrategy;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailPasswordStrategy,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    strategy = module.get<EmailPasswordStrategy>(EmailPasswordStrategy);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid credentials', async () => {
      const credentials: EmailPasswordCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
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

      const result = await strategy.authenticate(credentials);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error with invalid credentials', async () => {
      const credentials: EmailPasswordCredentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials', status: 401 },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(strategy.authenticate(credentials)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const credentials: EmailPasswordCredentials = {
        email: 'new@example.com',
        password: 'password123',
      };

      const mockClient = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'new-user-id',
                email: 'new@example.com',
                email_confirmed_at: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              session: {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                expires_in: 3600,
                expires_at: Date.now() + 3600000,
                token_type: 'bearer',
                user: {
                  id: 'new-user-id',
                  email: 'new@example.com',
                  email_confirmed_at: null,
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

      const result = await strategy.signUp(credentials);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
      expect(result.user.emailVerified).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate token and return user', async () => {
      const token = 'valid-token';

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-id',
                email: 'test@example.com',
                email_confirmed_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await strategy.validate(token);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-id');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error with invalid token', async () => {
      const token = 'invalid-token';

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid token' },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(strategy.validate(token)).rejects.toThrow('Invalid token');
    });
  });
});

