import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';

/**
 * Creates a mock Supabase client with storage support
 */
export const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockStorage = {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    })),
  };

  return {
    from: mockFrom,
    storage: mockStorage,
  };
};

/**
 * Creates a mock Supabase client without storage
 */
export const createMockSupabaseClientWithoutStorage = () => {
  const mockFrom = jest.fn();
  return {
    from: mockFrom,
  };
};

/**
 * Helper to create a chainable mock query for Supabase
 */
export const createMockQuery = (mockData: any, mockError: any = null) => {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        neq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockData,
            error: mockError,
          }),
        }),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: mockError,
        }),
      }),
      order: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockData,
          error: mockError,
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: mockError,
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockData,
            error: mockError,
          }),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: mockError,
      }),
    }),
  };
};

/**
 * Creates a mock SupabaseService
 */
export const createMockSupabaseService = (): Partial<SupabaseService> => {
  return {
    getRawClient: jest.fn(),
    getClient: jest.fn(),
    getClientWithToken: jest.fn(),
  };
};

