import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScheduledAreaController } from 'src/basic/schedule-area/controllers/scheduled-area.controller';
import { ScheduledAreaService } from 'src/basic/schedule-area/services/scheduled-area.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreateScheduledAreaDto } from 'src/basic/schedule-area/dto/create-scheduled-area.dto';
import { UpdateScheduledAreaDto } from 'src/basic/schedule-area/dto/update-scheduled-area.dto';
import {
  ScheduledAreaResponseDto,
  ImageUploadResponseDto,
  PaginatedScheduledAreaResponseDto,
  ToggleFavoriteDto,
} from 'src/basic/schedule-area/dto/scheduled-area-response.dto';

describe('ScheduledAreaController', () => {
  let controller: ScheduledAreaController;
  let service: ScheduledAreaService;

  const mockScheduledAreaResponse: ScheduledAreaResponseDto = {
    id: '1c5fdd77-416e-49db-88ac-cdb8a849e8b3',
    name: 'Área de Produção',
    description: 'Setor responsável pela produção',
    responsiblePersonId: '123e4567-e89b-12d3-a456-426614174000',
    responsiblePerson: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
      photoUrl: 'https://example.com/photos/person-123.jpg',
    },
    imageUrl: 'https://example.com/images/area-123.jpg',
    favorite: false,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockPaginatedResponse: PaginatedScheduledAreaResponseDto = {
    data: [mockScheduledAreaResponse],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  const mockImageUploadResponse: ImageUploadResponseDto = {
    message: 'Image uploaded successfully',
    imageUrl: 'https://example.com/images/area-123.jpg',
    scheduledAreaId: '1c5fdd77-416e-49db-88ac-cdb8a849e8b3',
  };

  const mockScheduledAreaService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    toggleFavorite: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };

  const mockConfigService = {
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

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledAreaController],
      providers: [
        {
          provide: ScheduledAreaService,
          useValue: mockScheduledAreaService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    }).compile();

    controller = module.get<ScheduledAreaController>(ScheduledAreaController);
    service = module.get<ScheduledAreaService>(ScheduledAreaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a scheduled area', async () => {
      const createScheduledAreaDto: CreateScheduledAreaDto = {
        name: 'Área de Produção',
        description: 'Setor responsável pela produção',
        responsiblePersonId: '123e4567-e89b-12d3-a456-426614174000',
        favorite: false,
      };

      mockScheduledAreaService.create.mockResolvedValue(mockScheduledAreaResponse);

      const result = await controller.create(createScheduledAreaDto);

      expect(mockScheduledAreaService.create).toHaveBeenCalledWith(createScheduledAreaDto);
      expect(result).toEqual(mockScheduledAreaResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of scheduled areas', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', undefined);

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(undefined, undefined, undefined);

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle pagination parameters correctly', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          page: 2,
          limit: 20,
        },
      });

      const result = await controller.findAll('2', '20', undefined);

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(2, 20, undefined);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(20);
    });

    it('should limit max items per page to 100', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          limit: 100,
        },
      });

      const result = await controller.findAll('1', '200', undefined);

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 100, undefined);
      expect(result.meta.limit).toBe(100);
    });

    it('should ensure minimum page is 1', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('0', '10', undefined);

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should handle favorite filter correctly', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', 'true');

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 10, true);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle favorite filter as false', async () => {
      mockScheduledAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', 'false');

      expect(mockScheduledAreaService.findAll).toHaveBeenCalledWith(1, 10, false);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a scheduled area by id', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';

      mockScheduledAreaService.findOne.mockResolvedValue(mockScheduledAreaResponse);

      const result = await controller.findOne(scheduledAreaId);

      expect(mockScheduledAreaService.findOne).toHaveBeenCalledWith(scheduledAreaId);
      expect(result).toEqual(mockScheduledAreaResponse);
    });
  });

  describe('update', () => {
    it('should update a scheduled area', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';
      const updateScheduledAreaDto: UpdateScheduledAreaDto = {
        name: 'Área de Produção Atualizada',
        favorite: true,
      };

      const updatedScheduledArea = {
        ...mockScheduledAreaResponse,
        name: 'Área de Produção Atualizada',
        favorite: true,
      };

      mockScheduledAreaService.update.mockResolvedValue(updatedScheduledArea);

      const result = await controller.update(scheduledAreaId, updateScheduledAreaDto);

      expect(mockScheduledAreaService.update).toHaveBeenCalledWith(
        scheduledAreaId,
        updateScheduledAreaDto,
      );
      expect(result).toEqual(updatedScheduledArea);
      expect(result.name).toBe('Área de Produção Atualizada');
      expect(result.favorite).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled area', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';

      mockScheduledAreaService.remove.mockResolvedValue(undefined);

      await controller.remove(scheduledAreaId);

      expect(mockScheduledAreaService.remove).toHaveBeenCalledWith(scheduledAreaId);
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';
      const mockFile: Express.Multer.File = {
        fieldname: 'image',
        originalname: 'image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake-image-data'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockScheduledAreaService.uploadImage.mockResolvedValue(mockImageUploadResponse);

      const mockRequest = { token: 'test-token' } as any;
      const result = await controller.uploadImage(scheduledAreaId, mockFile, mockRequest);

      expect(mockScheduledAreaService.uploadImage).toHaveBeenCalledWith(
        scheduledAreaId,
        mockFile,
        'test-token',
      );
      expect(result).toEqual(mockImageUploadResponse);
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';

      mockScheduledAreaService.deleteImage.mockResolvedValue(undefined);

      const mockRequest = { token: 'test-token' } as any;
      await controller.deleteImage(scheduledAreaId, mockRequest);

      expect(mockScheduledAreaService.deleteImage).toHaveBeenCalledWith(
        scheduledAreaId,
        'test-token',
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';
      const toggleFavoriteDto: ToggleFavoriteDto = {
        favorite: true,
      };

      const updatedScheduledArea = {
        ...mockScheduledAreaResponse,
        favorite: true,
      };

      mockScheduledAreaService.toggleFavorite.mockResolvedValue(updatedScheduledArea);

      const result = await controller.toggleFavorite(scheduledAreaId, toggleFavoriteDto);

      expect(mockScheduledAreaService.toggleFavorite).toHaveBeenCalledWith(
        scheduledAreaId,
        true,
      );
      expect(result).toEqual(updatedScheduledArea);
      expect(result.favorite).toBe(true);
    });
  });
});



