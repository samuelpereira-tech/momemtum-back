import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleCommentController } from 'src/basic/automatic-schedule/controllers/schedule-comment.controller';
import { ScheduleCommentService } from 'src/basic/automatic-schedule/services/schedule-comment.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import {
  createMockScheduleCommentService,
  createMockCreateScheduleCommentDto,
  createMockUpdateScheduleCommentDto,
  createMockScheduleCommentResponseDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('ScheduleCommentController', () => {
  let controller: ScheduleCommentController;
  let service: ScheduleCommentService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();
  const mockCommentId = faker.string.uuid();
  const mockUserId = faker.string.uuid();

  const mockScheduleCommentService = createMockScheduleCommentService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleCommentController],
      providers: [
        {
          provide: ScheduleCommentService,
          useValue: mockScheduleCommentService,
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

    controller = module.get<ScheduleCommentController>(ScheduleCommentController);
    service = module.get<ScheduleCommentService>(ScheduleCommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto = createMockCreateScheduleCommentDto();
    const mockResponse = createMockScheduleCommentResponseDto({
      authorId: mockUserId,
    });
    const mockRequest = {
      user: { id: mockUserId },
    } as any;

    it('should create schedule comment successfully', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.create(
        mockScheduledAreaId,
        mockScheduleId,
        createDto,
        mockRequest,
      );

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        createDto,
        mockUserId,
      );
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleCommentDto();
    const mockResponse = createMockScheduleCommentResponseDto({
      id: mockCommentId,
      authorId: mockUserId,
    });
    const mockRequest = {
      user: { id: mockUserId },
    } as any;

    it('should update schedule comment successfully', async () => {
      (service.update as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.update(
        mockScheduledAreaId,
        mockScheduleId,
        mockCommentId,
        updateDto,
        mockRequest,
      );

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        mockCommentId,
        updateDto,
        mockUserId,
      );
    });
  });

  describe('remove', () => {
    const mockRequest = {
      user: { id: mockUserId },
    } as any;

    it('should remove schedule comment successfully', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockScheduledAreaId, mockScheduleId, mockCommentId, mockRequest);

      expect(service.remove).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        mockCommentId,
        mockUserId,
      );
    });
  });
});







