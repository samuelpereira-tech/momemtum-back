import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    supabaseService = module.get<SupabaseService>(SupabaseService);
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
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-id',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
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

    it('should throw UnauthorizedException with invalid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        user: null,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid token' },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

