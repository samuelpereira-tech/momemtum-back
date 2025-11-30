import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/authentication/core/controllers/auth.controller';
import { AuthService } from 'src/authentication/core/services/auth.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { OAuthProvider } from 'src/authentication/core/interfaces/auth.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    signUpWithEmailPassword: jest.fn(),
    signInWithEmailPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithOAuthCallback: jest.fn(),
    signInWithMagicLink: jest.fn(),
    verifyMagicLink: jest.fn(),
    signInWithOTP: jest.fn(),
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
    refreshToken: jest.fn(),
    signOut: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('should call signUpWithEmailPassword', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: { id: 'user-id', email: dto.email },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockAuthService.signUpWithEmailPassword.mockResolvedValue(expectedResult);

      const result = await controller.signUp(dto);

      expect(mockAuthService.signUpWithEmailPassword).toHaveBeenCalledWith(
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signInWithEmailPassword', () => {
    it('should call signInWithEmailPassword', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: { id: 'user-id', email: dto.email },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockAuthService.signInWithEmailPassword.mockResolvedValue(expectedResult);

      const result = await controller.signInWithEmailPassword(dto);

      expect(mockAuthService.signInWithEmailPassword).toHaveBeenCalledWith(
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signInWithOAuth', () => {
    it('should get OAuth authorization URL', async () => {
      const provider = OAuthProvider.GOOGLE;
      const redirectUri = 'http://localhost:3000/callback';
      const expectedUrl = 'https://oauth.provider.com/authorize';

      mockAuthService.signInWithOAuth.mockResolvedValue(expectedUrl);

      const result = await controller.signInWithOAuth(provider, redirectUri);

      expect(mockAuthService.signInWithOAuth).toHaveBeenCalledWith(
        provider,
        redirectUri,
      );
      expect(result).toBeDefined();
    });
  });

  describe('signInWithMagicLink', () => {
    it('should send magic link', async () => {
      const dto = {
        email: 'test@example.com',
        redirectTo: 'http://localhost:3000/callback',
      };

      const expectedResult = {
        user: { id: 'user-id', email: dto.email },
        session: {},
        accessToken: '',
        refreshToken: '',
      };

      mockAuthService.signInWithMagicLink.mockResolvedValue(expectedResult);

      const result = await controller.signInWithMagicLink(dto);

      expect(mockAuthService.signInWithMagicLink).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signInWithOTP', () => {
    it('should send OTP when code is not provided', async () => {
      const dto = {
        phone: '+5511999999999',
      };

      const expectedResult = {
        user: { id: 'user-id', phone: dto.phone },
        session: {},
        accessToken: '',
        refreshToken: '',
      };

      mockAuthService.sendOTP.mockResolvedValue(expectedResult);

      const result = await controller.signInWithOTP(dto);

      expect(mockAuthService.sendOTP).toHaveBeenCalledWith(dto.phone);
      expect(result).toEqual(expectedResult);
    });

    it('should verify OTP when code is provided', async () => {
      const dto = {
        phone: '+5511999999999',
        code: '123456',
      };

      const expectedResult = {
        user: { id: 'user-id', phone: dto.phone },
        session: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      };

      mockAuthService.verifyOTP.mockResolvedValue(expectedResult);

      const result = await controller.signInWithOTP(dto);

      expect(mockAuthService.verifyOTP).toHaveBeenCalledWith(
        dto.phone,
        dto.code,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});

