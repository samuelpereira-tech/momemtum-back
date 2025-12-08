import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleController } from 'src/basic/automatic-schedule/controllers/schedule.controller';
import { ScheduleService } from 'src/basic/automatic-schedule/services/schedule.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import {
  createMockScheduleService,
  createMockScheduleResponseDto,
  createMockScheduleDetailsResponseDto,
  createMockCreateScheduleDto,
  createMockUpdateScheduleDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let service: ScheduleService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();

  const mockScheduleService = createMockScheduleService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        {
          provide: ScheduleService,
          useValue: mockScheduleService,
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

    controller = module.get<ScheduleController>(ScheduleController);
    service = module.get<ScheduleService>(ScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockResponse = {
      data: [
        createMockScheduleResponseDto({
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

    it('should return paginated list of schedules', async () => {
      (service.findAll as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockScheduledAreaId);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockScheduledAreaId, 1, 10, {});
    });

    it('should pass filters to service', async () => {
      (service.findAll as jest.Mock).mockResolvedValue(mockResponse);

      await controller.findAll(
        mockScheduledAreaId,
        '1',
        '10',
        faker.string.uuid(),
        '2025-01-01',
        '2025-01-31',
        faker.string.uuid(),
        faker.string.uuid(),
        faker.string.uuid(),
        'confirmed',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        mockScheduledAreaId,
        1,
        10,
        expect.objectContaining({
          status: 'confirmed',
        }),
      );
    });
  });

  describe('create', () => {
    const createDto = createMockCreateScheduleDto({
      scheduledAreaId: mockScheduledAreaId,
    });
    const mockResponse = createMockScheduleResponseDto({
      scheduledAreaId: mockScheduledAreaId,
    });

    it('should create schedule successfully', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.create(mockScheduledAreaId, createDto);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockScheduledAreaId, createDto);
    });
  });

  describe('findOne', () => {
    const mockResponse = createMockScheduleDetailsResponseDto({
      id: mockScheduleId,
      scheduledAreaId: mockScheduledAreaId,
    });

    it('should return schedule by id', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockScheduledAreaId, mockScheduleId);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockScheduledAreaId, mockScheduleId);
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleDto();
    const mockResponse = createMockScheduleDetailsResponseDto({
      id: mockScheduleId,
      scheduledAreaId: mockScheduledAreaId,
    });

    it('should update schedule successfully', async () => {
      (service.update as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.update(mockScheduledAreaId, mockScheduleId, updateDto);

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete schedule successfully', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockScheduledAreaId, mockScheduleId);

      expect(service.remove).toHaveBeenCalledWith(mockScheduledAreaId, mockScheduleId);
    });
  });
});



