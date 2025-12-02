import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import * as supabaseJs from '@supabase/supabase-js';

// Mock do módulo @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let supabaseService: SupabaseService;
  let createClientSpy: jest.SpyInstance;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SUPABASE_URL') {
        return 'https://test.supabase.co';
      }
      if (key === 'SUPABASE_ANON_KEY') {
        return 'test-anon-key';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') {
        return 'https://test.supabase.co';
      }
      if (key === 'SUPABASE_ANON_KEY') {
        return 'test-anon-key';
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true with valid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: null,
        token: null,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      // Mock do createClient do Supabase
      const mockAuthClient = {
        setSession: jest.fn().mockResolvedValue({
          data: { session: {} },
          error: null,
        }),
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      };

      const mockSupabaseClient = {
        auth: mockAuthClient,
      };

      // Mock do createClient
      (supabaseJs.createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.token).toBe('valid-token');
      expect(mockAuthClient.getUser).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is missing', async () => {
      const mockRequest = {
        headers: {},
        user: null,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      try {
        await guard.canActivate(mockContext);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Token not provided');
      }
    });

    it('should throw UnauthorizedException with invalid token (setSession error)', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        user: null,
        token: null,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      // Mock do createClient do Supabase com erro no setSession
      const mockAuthClient = {
        setSession: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid token' },
        }),
        getUser: jest.fn(),
      };

      const mockSupabaseClient = {
        auth: mockAuthClient,
      };

      // Mock do createClient
      createClientSpy = jest
        .spyOn(supabaseJs, 'createClient')
        .mockReturnValue(mockSupabaseClient as any);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when getUser returns error', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer token',
        },
        user: null,
        token: null,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      // Mock do createClient do Supabase com erro no getUser
      const mockAuthClient = {
        setSession: jest.fn().mockResolvedValue({
          data: { session: {} },
          error: null,
        }),
        getUser: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid token' },
        }),
      };

      const mockSupabaseClient = {
        auth: mockAuthClient,
      };

      // Mock do createClient
      createClientSpy = jest
        .spyOn(supabaseJs, 'createClient')
        .mockReturnValue(mockSupabaseClient as any);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
