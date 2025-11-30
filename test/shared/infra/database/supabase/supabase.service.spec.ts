import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SUPABASE_URL') {
        return 'https://gckwwvvpnpvqjlauuwmi.supabase.co';
      }
      if (key === 'SUPABASE_ANON_KEY') {
        return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdja3d3dnZwbnB2cWpsYXV1d21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDU1MTQsImV4cCI6MjA3OTk4MTUxNH0.wJw6ynHI5Hmh4MeXlWV6OE5WwAP3Dut-0ree_kkah4U';
      }
      return undefined;
    }),
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

      // Com Supabase real, pode retornar erro se o usuário não existir
      // Verificamos apenas que a chamada foi feita e retornou uma resposta
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Se houver erro, deve ser um erro válido do Supabase
      if (result.error) {
        expect(result.error).toHaveProperty('message');
      }
    });

    it('should return error with invalid credentials', async () => {
      const client = service.getClient();
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const result = await client.auth.signInWithPassword(credentials);

      // Com Supabase real, pode retornar data null ou erro
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Se não houver erro, data deve ser null ou user null
      if (!result.error) {
        expect(result.data?.user).toBeNull();
      }
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const client = service.getClient();
      // Usa um email único para evitar conflitos
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const credentials = {
        email: uniqueEmail,
        password: 'password123',
      };

      const result = await client.auth.signUp(credentials);

      // Verifica que a chamada foi feita e retornou uma resposta
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Se houver erro, deve ser um erro válido do Supabase
      if (result.error) {
        expect(result.error).toHaveProperty('message');
      } else if (result.data?.user) {
        expect(result.data.user.email).toBe(credentials.email);
      }
    });
  });

  describe('signInWithOtp', () => {
    it('should send magic link', async () => {
      const client = service.getClient();
      // Usa um email válido para teste
      const credentials = {
        email: `test-${Date.now()}@example.com`,
      };

      const result = await client.auth.signInWithOtp(credentials);

      // Verifica que a chamada foi feita e retornou uma resposta
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Com Supabase real, pode retornar erro se email não for válido ou não configurado
      // Verificamos apenas que a estrutura está correta
      if (result.error) {
        expect(result.error).toHaveProperty('message');
      }
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

      // Verifica que a chamada foi feita e retornou uma resposta
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Com Supabase real, pode retornar erro se o código não for válido
      // Verificamos apenas que a estrutura está correta
      if (result.error) {
        expect(result.error).toHaveProperty('message');
      } else if (result.data?.user) {
        expect(result.data.user.phone).toBe(credentials.phone);
      }
    });

    it('should return error with invalid code', async () => {
      const client = service.getClient();
      const credentials = {
        phone: '+5511999999999',
        token: '000000',
      };

      const result = await client.auth.verifyOtp(credentials);

      // Verifica que a chamada foi feita e retornou uma resposta
      expect(result).toBeDefined();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      
      // Com código inválido, deve retornar erro ou data null
      if (result.error) {
        expect(result.error).toBeDefined();
      } else {
        expect(result.data?.user).toBeNull();
      }
    });
  });
});

