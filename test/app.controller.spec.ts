import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';

describe('AppController', () => {
  let appController: AppController;

  const mockSupabaseService = {
    healthCheck: jest.fn().mockResolvedValue({
      status: 'ok',
      message: 'Supabase is connected and responding',
      connected: true,
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});

