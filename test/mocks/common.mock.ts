import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { faker } from '@faker-js/faker';

/**
 * Creates a mock ConfigService
 */
export const createMockConfigService = (): Partial<ConfigService> => {
  return {
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
};

/**
 * Creates a mock AuthGuard
 */
export const createMockAuthGuard = (): Partial<AuthGuard> => {
  return {
    canActivate: jest.fn(() => true),
  };
};

/**
 * Creates a mock Multer file
 */
export const createMockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => {
  return {
    fieldname: 'file',
    originalname: faker.system.fileName({ extensionCount: 1 }),
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
};

