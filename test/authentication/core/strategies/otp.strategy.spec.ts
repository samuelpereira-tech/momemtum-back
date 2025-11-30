import { Test, TestingModule } from '@nestjs/testing';
import { OTPStrategy } from 'src/authentication/core/strategies/otp.strategy';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { OTPCredentials } from 'src/authentication/core/interfaces/auth.interface';

describe('OTPStrategy', () => {
  let strategy: OTPStrategy;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OTPStrategy,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    strategy = module.get<OTPStrategy>(OTPStrategy);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('sendOTP', () => {
    it('should send OTP code successfully', async () => {
      const credentials: OTPCredentials = {
        phone: '+5511999999999',
      };

      const mockClient = {
        auth: {
          signInWithOtp: jest.fn().mockResolvedValue({
            data: { message: 'OTP sent successfully' },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await strategy.sendOTP(credentials);

      expect(result).toBeDefined();
      expect(result.user.phone).toBe(credentials.phone);
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP code successfully', async () => {
      const credentials: OTPCredentials = {
        phone: '+5511999999999',
        code: '123456',
      };

      const mockClient = {
        auth: {
          verifyOtp: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-id',
                phone: '+5511999999999',
                phone_confirmed_at: '2024-01-01T00:00:00Z',
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
                  phone: '+5511999999999',
                  phone_confirmed_at: '2024-01-01T00:00:00Z',
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

      const result = await strategy.verifyOTP(credentials);

      expect(result).toBeDefined();
      expect(result.user.phone).toBe(credentials.phone);
      expect(result.user.phoneVerified).toBe(true);
    });

    it('should throw error with invalid OTP code', async () => {
      const credentials: OTPCredentials = {
        phone: '+5511999999999',
        code: '000000',
      };

      const mockClient = {
        auth: {
          verifyOtp: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid OTP code', status: 401 },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(strategy.verifyOTP(credentials)).rejects.toThrow(
        'Invalid OTP code',
      );
    });
  });
});

