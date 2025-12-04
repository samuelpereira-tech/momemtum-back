import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledAreaService } from 'src/basic/schedule-area/services/scheduled-area.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateScheduledAreaDto } from 'src/basic/schedule-area/dto/create-scheduled-area.dto';
import { UpdateScheduledAreaDto } from 'src/basic/schedule-area/dto/update-scheduled-area.dto';

describe('ScheduledAreaService', () => {
  let service: ScheduledAreaService;
  let supabaseService: SupabaseService;

  const mockPersonId = '123e4567-e89b-12d3-a456-426614174000';
  const mockScheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';

  const mockScheduledAreaData = {
    id: mockScheduledAreaId,
    name: 'Área de Produção',
    description: 'Setor responsável pela produção',
    responsible_person_id: mockPersonId,
    image_url: 'https://example.com/images/area-123.jpg',
    favorite: false,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    responsible_person: {
      id: mockPersonId,
      full_name: 'João Silva',
      email: 'joao.silva@example.com',
      photo_url: 'https://example.com/photos/person-123.jpg',
    },
  };

  const mockScheduledAreaResponse = {
    id: mockScheduledAreaId,
    name: 'Área de Produção',
    description: 'Setor responsável pela produção',
    responsiblePersonId: mockPersonId,
    responsiblePerson: {
      id: mockPersonId,
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
      photoUrl: 'https://example.com/photos/person-123.jpg',
    },
    imageUrl: 'https://example.com/images/area-123.jpg',
    favorite: false,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

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

  const mockSupabaseService = {
    getRawClient: jest.fn(),
    getClientWithToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledAreaService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduledAreaService>(ScheduledAreaService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createScheduledAreaDto: CreateScheduledAreaDto = {
      name: 'Área de Produção',
      description: 'Setor responsável pela produção',
      responsiblePersonId: mockPersonId,
      favorite: false,
    };

    it('should create a scheduled area successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock person check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockPersonId },
            }),
          }),
        }),
      });

      // Mock insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(createScheduledAreaDto);

      expect(result.name).toBe('Área de Produção');
      expect(result.responsiblePersonId).toBe(mockPersonId);
      expect(result.favorite).toBe(false);
    });

    it('should throw NotFoundException if responsible person not found', async () => {
      const mockClient = createMockSupabaseClient();

      // Person not found
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createScheduledAreaDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of scheduled areas', async () => {
      const mockClient = createMockSupabaseClient();

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [mockScheduledAreaData],
            error: null,
            count: 1,
          }),
        }),
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by favorite status', async () => {
      const mockClient = createMockSupabaseClient();

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [mockScheduledAreaData],
            error: null,
            count: 1,
          }),
        }),
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, true);

      expect(result.data).toHaveLength(1);
      expect(mockQuery.eq).toHaveBeenCalledWith('favorite', true);
    });

    it('should use default values when params are not provided', async () => {
      const mockClient = createMockSupabaseClient();

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should limit max items per page to 100', async () => {
      const mockClient = createMockSupabaseClient();

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 200);

      expect(result.meta.limit).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return a scheduled area by id', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(mockScheduledAreaId);

      expect(result.id).toBe(mockScheduledAreaId);
      expect(result.name).toBe('Área de Produção');
      expect(result.responsiblePerson).toBeDefined();
      expect(result.responsiblePerson?.photoUrl).toBe('https://example.com/photos/person-123.jpg');
    });

    it('should throw NotFoundException if scheduled area not found', async () => {
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

      await expect(service.findOne(mockScheduledAreaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a scheduled area successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const updateScheduledAreaDto: UpdateScheduledAreaDto = {
        name: 'Área de Produção Atualizada',
        favorite: true,
      };

      // Mock findOne (called by update)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockScheduledAreaData,
                  name: 'Área de Produção Atualizada',
                  favorite: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(mockScheduledAreaId, updateScheduledAreaDto);

      expect(result.name).toBe('Área de Produção Atualizada');
      expect(result.favorite).toBe(true);
    });

    it('should throw NotFoundException if responsible person not found when updating', async () => {
      const mockClient = createMockSupabaseClient();
      const updateScheduledAreaDto: UpdateScheduledAreaDto = {
        responsiblePersonId: 'non-existent-id',
      };

      // Mock findOne (called by update)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock person check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.update(mockScheduledAreaId, updateScheduledAreaDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled area successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne (called by remove)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock delete
      mockClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await service.remove(mockScheduledAreaId);

      expect(mockClient.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const mockClient = createMockSupabaseClient();
      const mockFile: any = {
        fieldname: 'image',
        originalname: 'image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake-image-data'),
      };

      // Mock findOne (called by uploadImage)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock storage upload
      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'scheduled-areas/area-123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: {
            publicUrl: 'https://example.com/images/area-123.jpg',
          },
        }),
      };

      mockClient.storage.from.mockReturnValueOnce(mockStorageBucket);
      // Mock getPublicUrl call (second call to storage.from)
      mockClient.storage.from.mockReturnValueOnce(mockStorageBucket);

      // Mock update image_url
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockScheduledAreaData,
                  image_url: 'https://example.com/images/area-123.jpg',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.uploadImage(mockScheduledAreaId, mockFile);

      expect(result.message).toBe('Image uploaded successfully');
      expect(result.imageUrl).toBe('https://example.com/images/area-123.jpg');
      expect(result.scheduledAreaId).toBe(mockScheduledAreaId);
    });

    it('should throw BadRequestException if file is invalid', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.uploadImage(mockScheduledAreaId, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file format is invalid', async () => {
      const mockClient = createMockSupabaseClient();
      const mockFile: any = {
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('fake-data'),
        originalname: 'file.pdf',
      };

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.uploadImage(mockScheduledAreaId, mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file size exceeds 5MB', async () => {
      const mockClient = createMockSupabaseClient();
      const mockFile: any = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.from('fake-data'),
        originalname: 'image.jpg',
      };

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.uploadImage(mockScheduledAreaId, mockFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne (called by deleteImage)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock storage remove
      mockClient.storage.from.mockReturnValueOnce({
        remove: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock update image_url to null
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await service.deleteImage(mockScheduledAreaId);

      expect(mockClient.storage.from).toHaveBeenCalled();
    });

    it('should throw NotFoundException if image does not exist', async () => {
      const mockClient = createMockSupabaseClient();

      const areaWithoutImage = {
        ...mockScheduledAreaData,
        image_url: null,
      };

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: areaWithoutImage,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.deleteImage(mockScheduledAreaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne (called by toggleFavorite)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAreaData,
              error: null,
            }),
          }),
        }),
      });

      // Mock update favorite
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockScheduledAreaData,
                  favorite: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.toggleFavorite(mockScheduledAreaId, true);

      expect(result.favorite).toBe(true);
    });
  });
});

