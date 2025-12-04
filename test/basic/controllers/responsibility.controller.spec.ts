import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResponsibilityController } from 'src/basic/responsibilities/controllers/responsibility.controller';
import { ResponsibilityService } from 'src/basic/responsibilities/services/responsibility.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreateResponsibilityDto } from 'src/basic/responsibilities/dto/create-responsibility.dto';
import { UpdateResponsibilityDto } from 'src/basic/responsibilities/dto/update-responsibility.dto';
import {
  ResponsibilityResponseDto,
  ImageUploadResponseDto,
  PaginatedResponsibilityResponseDto,
} from 'src/basic/responsibilities/dto/responsibility-response.dto';

describe('ResponsibilityController', () => {
  let controller: ResponsibilityController;
  let service: ResponsibilityService;

  const mockResponsibilityResponse: ResponsibilityResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Responsabilidade de Produção',
    description: 'Responsável por gerenciar a produção diária',
    scheduledAreaId: '1c5fdd77-416e-49db-88ac-cdb8a849e8b3',
    scheduledArea: {
      id: '1c5fdd77-416e-49db-88ac-cdb8a849e8b3',
      name: 'Área de Produção',
    },
    imageUrl: 'https://example.com/images/responsibility-123.jpg',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockPaginatedResponse: PaginatedResponsibilityResponseDto = {
    data: [mockResponsibilityResponse],
    meta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  const mockImageUploadResponse: ImageUploadResponseDto = {
    message: 'Image uploaded successfully',
    imageUrl: 'https://example.com/images/responsibility-123.jpg',
    responsibilityId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockResponsibilityService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
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
      controllers: [ResponsibilityController],
      providers: [
        {
          provide: ResponsibilityService,
          useValue: mockResponsibilityService,
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

    controller = module.get<ResponsibilityController>(ResponsibilityController);
    service = module.get<ResponsibilityService>(ResponsibilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a responsibility', async () => {
      const createResponsibilityDto: CreateResponsibilityDto = {
        name: 'Responsabilidade de Produção',
        description: 'Responsável por gerenciar a produção diária',
        scheduledAreaId: '1c5fdd77-416e-49db-88ac-cdb8a849e8b3',
      };

      mockResponsibilityService.create.mockResolvedValue(mockResponsibilityResponse);

      const result = await controller.create(createResponsibilityDto);

      expect(mockResponsibilityService.create).toHaveBeenCalledWith(createResponsibilityDto);
      expect(result).toEqual(mockResponsibilityResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of responsibilities', async () => {
      mockResponsibilityService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10');

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      mockResponsibilityService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(undefined, undefined);

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle pagination parameters correctly', async () => {
      mockResponsibilityService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          page: 2,
          limit: 20,
        },
      });

      const result = await controller.findAll('2', '20');

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(2, 20, undefined);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(20);
    });

    it('should limit max items per page to 100', async () => {
      mockResponsibilityService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          limit: 100,
        },
      });

      const result = await controller.findAll('1', '200');

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(1, 100, undefined);
      expect(result.meta.limit).toBe(100);
    });

    it('should ensure minimum page is 1', async () => {
      mockResponsibilityService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('0', '10');

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should filter by scheduledAreaId when provided', async () => {
      const scheduledAreaId = '1c5fdd77-416e-49db-88ac-cdb8a849e8b3';
      mockResponsibilityService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', scheduledAreaId);

      expect(mockResponsibilityService.findAll).toHaveBeenCalledWith(1, 10, scheduledAreaId);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a responsibility by id', async () => {
      const responsibilityId = '123e4567-e89b-12d3-a456-426614174000';

      mockResponsibilityService.findOne.mockResolvedValue(mockResponsibilityResponse);

      const result = await controller.findOne(responsibilityId);

      expect(mockResponsibilityService.findOne).toHaveBeenCalledWith(responsibilityId);
      expect(result).toEqual(mockResponsibilityResponse);
    });
  });

  describe('update', () => {
    it('should update a responsibility', async () => {
      const responsibilityId = '123e4567-e89b-12d3-a456-426614174000';
      const updateResponsibilityDto: UpdateResponsibilityDto = {
        name: 'Responsabilidade Atualizada',
      };

      const updatedResponsibility = {
        ...mockResponsibilityResponse,
        name: 'Responsabilidade Atualizada',
      };

      mockResponsibilityService.update.mockResolvedValue(updatedResponsibility);

      const result = await controller.update(responsibilityId, updateResponsibilityDto);

      expect(mockResponsibilityService.update).toHaveBeenCalledWith(
        responsibilityId,
        updateResponsibilityDto,
      );
      expect(result).toEqual(updatedResponsibility);
      expect(result.name).toBe('Responsabilidade Atualizada');
    });
  });

  describe('remove', () => {
    it('should delete a responsibility', async () => {
      const responsibilityId = '123e4567-e89b-12d3-a456-426614174000';

      mockResponsibilityService.remove.mockResolvedValue(undefined);

      await controller.remove(responsibilityId);

      expect(mockResponsibilityService.remove).toHaveBeenCalledWith(responsibilityId);
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const responsibilityId = '123e4567-e89b-12d3-a456-426614174000';
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

      mockResponsibilityService.uploadImage.mockResolvedValue(mockImageUploadResponse);

      const mockRequest = { token: 'test-token' } as any;
      const result = await controller.uploadImage(responsibilityId, mockFile, mockRequest);

      expect(mockResponsibilityService.uploadImage).toHaveBeenCalledWith(
        responsibilityId,
        mockFile,
        'test-token',
      );
      expect(result).toEqual(mockImageUploadResponse);
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const responsibilityId = '123e4567-e89b-12d3-a456-426614174000';

      mockResponsibilityService.deleteImage.mockResolvedValue(undefined);

      const mockRequest = { token: 'test-token' } as any;
      await controller.deleteImage(responsibilityId, mockRequest);

      expect(mockResponsibilityService.deleteImage).toHaveBeenCalledWith(
        responsibilityId,
        'test-token',
      );
    });
  });
});

