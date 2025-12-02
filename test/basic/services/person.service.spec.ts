import { Test, TestingModule } from '@nestjs/testing';
import { PersonService } from 'src/basic/services/person.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePersonDto } from 'src/basic/dto/create-person.dto';
import { UpdatePersonDto } from 'src/basic/dto/update-person.dto';

describe('PersonService', () => {
  let service: PersonService;
  let supabaseService: SupabaseService;

  // Mock data
  const mockPersonData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '11987654321',
    cpf: '12345678901',
    birth_date: '1990-01-15',
    emergency_contact: '11987654322',
    address: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
    photo_url: null,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
  };

  const mockPersonResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '11987654321',
    cpf: '12345678901',
    birthDate: '1990-01-15',
    emergencyContact: '11987654322',
    address: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
    photoUrl: null,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  // Mock Supabase client chain
  const createMockSupabaseClient = () => {
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

  // Helper to create a chainable mock query
  const createMockQuery = (mockData: any, mockError: any = null) => {
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

  const mockSupabaseService = {
    getRawClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<PersonService>(PersonService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPersonDto: CreatePersonDto = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '11987654321',
      cpf: '12345678901',
      birthDate: '1990-01-15',
      emergencyContact: '11987654322',
      address: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
    };

    it('should create a person successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const mockSelect = jest.fn();
      const mockEq = jest.fn();
      const mockSingle = jest.fn();
      const mockInsert = jest.fn();

      // Mock email check - no existing email
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      // Mock CPF check - no existing CPF
      mockSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      });

      // Mock insert
      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPersonData,
            error: null,
          }),
        }),
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'persons') {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(createPersonDto);

      expect(result).toEqual(mockPersonResponse);
      expect(mockClient.from).toHaveBeenCalledWith('persons');
    });

    it('should throw ConflictException if email already exists', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-id' },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createPersonDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createPersonDto)).rejects.toThrow(
        'Person with this email already exists',
      );
    });

    it('should throw ConflictException if CPF already exists', async () => {
      const mockClient = createMockSupabaseClient();

      // Email check - no existing email (first call)
      // CPF check - CPF exists (second call) - should throw before insert
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call - email check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null }), // Email não existe
              }),
            }),
          };
        } else if (callCount === 2) {
          // Second call - CPF check (this should trigger the exception)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'existing-id' }, // CPF existe - should throw ConflictException
                }),
              }),
            }),
          };
        }
        // Should not reach here if CPF check works correctly
        return {
          select: jest.fn(),
          insert: jest.fn(),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const promise = service.create(createPersonDto);
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow('Person with this CPF already exists');
      
      // Verify that insert was never called
      expect(callCount).toBeLessThanOrEqual(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of persons', async () => {
      const mockClient = createMockSupabaseClient();
      const mockData = [mockPersonData, { ...mockPersonData, id: 'another-id' }];

      // Mock count query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      // Mock data query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          count: 25,
          error: null,
        }),
      });

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [mockPersonData],
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(2, 10);

      expect(result.page).toBe(2);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should limit max items per page to 100', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          count: 200,
          error: null,
        }),
      });

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 200);

      expect(result.limit).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return a person by id', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPersonData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(personId);

      expect(result).toEqual(mockPersonResponse);
      expect(result.id).toBe(personId);
    });

    it('should throw NotFoundException if person not found', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = 'non-existent-id';

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.findOne(personId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(personId)).rejects.toThrow('Person not found');
    });
  });

  describe('update', () => {
    const updatePersonDto: UpdatePersonDto = {
      fullName: 'Jane Doe',
    };

    it('should update a person successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock findOne (check if person exists)
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'persons') {
          callCount++;
          if (callCount === 1) {
            // First call - findOne check
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonData,
                    error: null,
                  }),
                }),
              }),
            };
          } else if (callCount === 2) {
            // Second call - update
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { ...mockPersonData, full_name: 'Jane Doe' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(personId, updatePersonDto);

      expect(result.fullName).toBe('Jane Doe');
    });

    it('should throw NotFoundException if person not found', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = 'non-existent-id';

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.update(personId, updatePersonDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDto: UpdatePersonDto = {
        email: 'existing@example.com',
      };

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockPersonData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Email check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'other-id' },
                  }),
                }),
              }),
            }),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.update(personId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a person successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockPersonData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // delete
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.remove(personId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if person not found', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = 'non-existent-id';

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.remove(personId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadPhoto', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'photo',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake-image-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('should upload photo successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';
      const publicUrl = 'https://example.com/photos/person-123.jpg';

      // Mock findOne
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockPersonData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // update photo_url
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...mockPersonData, photo_url: publicUrl },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
      });

      // Mock storage
      mockClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'persons/person-123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl },
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.uploadPhoto(personId, mockFile);

      expect(result.photoUrl).toBe(publicUrl);
      expect(result.personId).toBe(personId);
      expect(result.message).toBe('Photo uploaded successfully');
    });

    it('should throw BadRequestException if file is missing', async () => {
      // The service calls findOne first, then checks for file
      // So we need to mock findOne
      const mockClient = createMockSupabaseClient();
      
      mockClient.from.mockReturnValue(
        createMockQuery(mockPersonData, null)
      );

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadPhoto('id', null as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadPhoto('id', null as any)).rejects.toThrow(
        'Photo file is required',
      );
    });

    it('should throw BadRequestException if file format is invalid', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPersonData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadPhoto('id', invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file size exceeds 5MB', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 }; // 6MB
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPersonData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadPhoto('id', largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';
      const personWithPhoto = {
        ...mockPersonData,
        photo_url: 'https://example.com/photos/person-123.jpg',
      };

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: personWithPhoto,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // update photo_url to null
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      mockClient.storage.from.mockReturnValue({
        remove: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.deletePhoto(personId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if photo does not exist', async () => {
      const mockClient = createMockSupabaseClient();
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPersonData, // no photo_url
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.deletePhoto(personId)).rejects.toThrow(NotFoundException);
      await expect(service.deletePhoto(personId)).rejects.toThrow(
        'Photo does not exist',
      );
    });
  });
});

