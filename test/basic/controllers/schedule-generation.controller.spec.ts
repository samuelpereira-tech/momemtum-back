import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleGenerationController } from 'src/basic/automatic-schedule/controllers/schedule-generation.controller';
import { ScheduleGenerationService } from 'src/basic/automatic-schedule/services/schedule-generation.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import {
  createMockScheduleGenerationService,
  createMockGenerationConfigurationDto,
  createMockScheduleGenerationResponseDto,
  createMockGenerationPreviewDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('ScheduleGenerationController', () => {
  let controller: ScheduleGenerationController;
  let service: ScheduleGenerationService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockGenerationId = faker.string.uuid();
  const mockUserId = faker.string.uuid();

  const mockScheduleGenerationService = createMockScheduleGenerationService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleGenerationController],
      providers: [
        {
          provide: ScheduleGenerationService,
          useValue: mockScheduleGenerationService,
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

    controller = module.get<ScheduleGenerationController>(
      ScheduleGenerationController,
    );
    service = module.get<ScheduleGenerationService>(ScheduleGenerationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('preview', () => {
    const config = createMockGenerationConfigurationDto({
      scheduledAreaId: mockScheduledAreaId,
    });
    const mockPreview = createMockGenerationPreviewDto();

    it('should generate preview successfully', async () => {
      (service.preview as jest.Mock).mockResolvedValue(mockPreview);

      const result = await controller.preview(mockScheduledAreaId, config);

      expect(result).toEqual(mockPreview);
      expect(service.preview).toHaveBeenCalledWith(mockScheduledAreaId, config);
    });
  });

  describe('create', () => {
    const config = createMockGenerationConfigurationDto({
      scheduledAreaId: mockScheduledAreaId,
    });
    const mockResponse = createMockScheduleGenerationResponseDto({
      scheduledAreaId: mockScheduledAreaId,
      createdBy: mockUserId,
    });
    const mockRequest = {
      user: { id: mockUserId },
    } as any;

    it('should create schedule generation successfully', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.create(mockScheduledAreaId, config, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(
        mockScheduledAreaId,
        config,
        mockUserId,
      );
    });
  });

  describe('findAll', () => {
    const mockResponse = {
      data: [
        createMockScheduleGenerationResponseDto({
          scheduledAreaId: mockScheduledAreaId,
        }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated list of schedule generations', async () => {
      (service.findAll as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockScheduledAreaId, '1', '10');

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockScheduledAreaId, 1, 10);
    });

    it('should use default pagination values', async () => {
      (service.findAll as jest.Mock).mockResolvedValue(mockResponse);

      await controller.findAll(mockScheduledAreaId);

      expect(service.findAll).toHaveBeenCalledWith(mockScheduledAreaId, 1, 10);
    });
  });

  describe('findOne', () => {
    const mockResponse = createMockScheduleGenerationResponseDto({
      id: mockGenerationId,
      scheduledAreaId: mockScheduledAreaId,
    });

    it('should return schedule generation by id', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockScheduledAreaId, mockGenerationId);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockScheduledAreaId, mockGenerationId);
    });
  });

  describe('remove', () => {
    it('should delete schedule generation successfully', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockScheduledAreaId, mockGenerationId);

      expect(service.remove).toHaveBeenCalledWith(mockScheduledAreaId, mockGenerationId);
    });
  });
});







