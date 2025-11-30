import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Inicializa o serviço chamando onModuleInit manualmente
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClient', () => {
    it('should return Supabase client', () => {
      const client = service.getClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });

  describe('signInWithPassword', () => {
    it('should authenticate with valid credentials', async () => {
      const client = service.getClient();
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await client.auth.signInWithPassword(credentials);

      expect(result.data).toBeDefined();
      expect(result.data.user.email).toBe(credentials.email);
      expect(result.error).toBeNull();
    });

    it('should return error with invalid credentials', async () => {
      const client = service.getClient();
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const result = await client.auth.signInWithPassword(credentials);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const client = service.getClient();
      const credentials = {
        email: 'new@example.com',
        password: 'password123',
      };

      const result = await client.auth.signUp(credentials);

      expect(result.data).toBeDefined();
      expect(result.data.user.email).toBe(credentials.email);
      expect(result.error).toBeNull();
    });
  });

  describe('signInWithOtp', () => {
    it('should send magic link', async () => {
      const client = service.getClient();
      const credentials = {
        email: 'test@example.com',
      };

      const result = await client.auth.signInWithOtp(credentials);

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP with valid code', async () => {
      const client = service.getClient();
      const credentials = {
        phone: '+5511999999999',
        token: '123456',
      };

      const result = await client.auth.verifyOtp(credentials);

      expect(result.data).toBeDefined();
      expect(result.data.user.phone).toBe(credentials.phone);
      expect(result.error).toBeNull();
    });

    it('should return error with invalid code', async () => {
      const client = service.getClient();
      const credentials = {
        phone: '+5511999999999',
        token: '000000',
      };

      const result = await client.auth.verifyOtp(credentials);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});

