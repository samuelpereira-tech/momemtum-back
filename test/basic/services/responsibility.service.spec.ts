import { Test, TestingModule } from '@nestjs/testing';
import { ResponsibilityService } from 'src/basic/responsibilities/services/responsibility.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateResponsibilityDto } from 'src/basic/responsibilities/dto/create-responsibility.dto';
import { UpdateResponsibilityDto } from 'src/basic/responsibilities/dto/update-responsibility.dto';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClient,
  createMockSupabaseService,
  createMockResponsibilityData,
  createMockResponsibilityResponse,
  createMockCreateResponsibilityDto,
  createMockFile,
} from '../../mocks';

describe('ResponsibilityService', () => {
  let service: ResponsibilityService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockResponsibilityId = faker.string.uuid();

  const mockResponsibilityData = createMockResponsibilityData({
    id: mockResponsibilityId,
    scheduled_area_id: mockScheduledAreaId,
  });

  const mockResponsibilityResponse = createMockResponsibilityResponse({
    id: mockResponsibilityId,
    name: mockResponsibilityData.name,
    description: mockResponsibilityData.description,
    scheduledAreaId: mockScheduledAreaId,
    scheduledArea: {
      id: mockScheduledAreaId,
      name: mockResponsibilityData.scheduled_area.name,
    },
    imageUrl: mockResponsibilityData.image_url,
    createdAt: mockResponsibilityData.created_at,
    updatedAt: mockResponsibilityData.updated_at,
  });

  const mockSupabaseService = createMockSupabaseService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsibilityService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ResponsibilityService>(ResponsibilityService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createResponsibilityDto = createMockCreateResponsibilityDto({
      name: mockResponsibilityData.name,
      description: mockResponsibilityData.description,
      scheduledAreaId: mockScheduledAreaId,
    });

    it('should create a responsibility successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock scheduled area check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockScheduledAreaId },
            }),
          }),
        }),
      });

      // Mock insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResponsibilityData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(createResponsibilityDto);

      expect(result.name).toBe(createResponsibilityDto.name);
      expect(result.scheduledAreaId).toBe(mockScheduledAreaId);
    });

    it('should throw NotFoundException if scheduled area not found', async () => {
      const mockClient = createMockSupabaseClient();

      // Scheduled area not found
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn(),
          insert: jest.fn(),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createResponsibilityDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createResponsibilityDto)).rejects.toThrow(
        'Scheduled area not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of responsibilities', async () => {
      const mockClient = createMockSupabaseClient();
      const mockData = [mockResponsibilityData, { ...mockResponsibilityData, id: faker.string.uuid() }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
              count: 2,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [mockResponsibilityData],
              error: null,
              count: 25,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should limit max items per page to 100', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
              count: 200,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 200);

      expect(result.meta.limit).toBe(100);
    });

    it('should filter by scheduledAreaId when provided', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockResponsibilityData],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, mockScheduledAreaId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a responsibility by id', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResponsibilityData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(mockResponsibilityId);

      expect(result).toEqual(mockResponsibilityResponse);
      expect(result.id).toBe(mockResponsibilityId);
    });

    it('should throw NotFoundException if responsibility not found', async () => {
      const mockClient = createMockSupabaseClient();

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

      const nonExistentId = faker.string.uuid();
      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        'Responsibility not found',
      );
    });
  });

  describe('update', () => {
    const updateResponsibilityDto: UpdateResponsibilityDto = {
      name: faker.person.jobTitle(),
    };

    it('should update a responsibility successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne (check if responsibility exists)
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'responsibilities') {
          if (callCount === 1) {
            // First call - findOne check
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockResponsibilityData,
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
                      data: { ...mockResponsibilityData, name: updateResponsibilityDto.name },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
        } else if (table === 'scheduled_areas') {
          // This shouldn't be called in this test
          return {
            select: jest.fn(),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(mockResponsibilityId, updateResponsibilityDto);

      expect(result.name).toBe(updateResponsibilityDto.name);
    });

    it('should throw NotFoundException if responsibility not found', async () => {
      const mockClient = createMockSupabaseClient();

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

      const nonExistentId = faker.string.uuid();
      await expect(service.update(nonExistentId, updateResponsibilityDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if scheduled area not found when updating', async () => {
      const mockClient = createMockSupabaseClient();
      const updateDto: UpdateResponsibilityDto = {
        scheduledAreaId: faker.string.uuid(),
      };

      let responsibilitiesCallCount = 0;
      let scheduledAreasCallCount = 0;
      
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'responsibilities') {
          responsibilitiesCallCount++;
          // Always return a valid mock for findOne
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockResponsibilityData,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn(),
                }),
              }),
            }),
          };
        } else if (table === 'scheduled_areas') {
          scheduledAreasCallCount++;
          // Scheduled area not found
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn(),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.update(mockResponsibilityId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(mockResponsibilityId, updateDto)).rejects.toThrow(
        'Scheduled area not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete a responsibility successfully', async () => {
      const mockClient = createMockSupabaseClient();

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockResponsibilityData,
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

      await expect(service.remove(mockResponsibilityId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if responsibility not found', async () => {
      const mockClient = createMockSupabaseClient();

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

      const nonExistentId = faker.string.uuid();
      await expect(service.remove(nonExistentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadImage', () => {
    const mockFile = createMockFile({ fieldname: 'image' });

    it('should upload image successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const publicUrl = faker.internet.url();

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
                  data: mockResponsibilityData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // update image_url
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...mockResponsibilityData, image_url: publicUrl },
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
          data: { path: `responsibilities/${faker.string.alphanumeric(10)}.jpg` },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl },
        }),
        remove: jest.fn(),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.uploadImage(mockResponsibilityId, mockFile);

      expect(result.imageUrl).toBe(publicUrl);
      expect(result.responsibilityId).toBe(mockResponsibilityId);
      expect(result.message).toBe('Image uploaded successfully');
    });

    it('should throw BadRequestException if file is missing', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResponsibilityData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadImage('id', null as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage('id', null as any)).rejects.toThrow(
        'Image file is required',
      );
    });

    it('should throw BadRequestException if file format is invalid', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResponsibilityData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadImage('id', invalidFile)).rejects.toThrow(
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
              data: mockResponsibilityData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.uploadImage('id', largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const responsibilityWithImage = {
        ...mockResponsibilityData,
        image_url: faker.internet.url(),
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
                  data: responsibilityWithImage,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // update image_url to null
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
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.deleteImage(mockResponsibilityId)).resolves.not.toThrow();
    });

    it('should throw NotFoundException if image does not exist', async () => {
      const mockClient = createMockSupabaseClient();
      const responsibilityWithoutImage = {
        ...mockResponsibilityData,
        image_url: null,
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: responsibilityWithoutImage,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.deleteImage(mockResponsibilityId)).rejects.toThrow(NotFoundException);
      await expect(service.deleteImage(mockResponsibilityId)).rejects.toThrow(
        'Image does not exist',
      );
    });
  });
});

