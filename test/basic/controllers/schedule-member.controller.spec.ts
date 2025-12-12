import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleMemberController } from 'src/basic/automatic-schedule/controllers/schedule-member.controller';
import { ScheduleMemberService } from 'src/basic/automatic-schedule/services/schedule-member.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { faker } from '@faker-js/faker';
import {
  createMockScheduleMemberService,
  createMockCreateScheduleMemberDto,
  createMockUpdateScheduleMemberDto,
  createMockScheduleMemberResponseDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('ScheduleMemberController', () => {
  let controller: ScheduleMemberController;
  let service: ScheduleMemberService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();
  const mockMemberId = faker.string.uuid();

  const mockScheduleMemberService = createMockScheduleMemberService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleMemberController],
      providers: [
        {
          provide: ScheduleMemberService,
          useValue: mockScheduleMemberService,
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

    controller = module.get<ScheduleMemberController>(ScheduleMemberController);
    service = module.get<ScheduleMemberService>(ScheduleMemberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto = createMockCreateScheduleMemberDto();
    const mockResponse = createMockScheduleMemberResponseDto();

    it('should create schedule member successfully', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.create(mockScheduledAreaId, mockScheduleId, createDto);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockScheduledAreaId, mockScheduleId, createDto);
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleMemberDto();
    const mockResponse = createMockScheduleMemberResponseDto();

    it('should update schedule member successfully', async () => {
      (service.update as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.update(
        mockScheduledAreaId,
        mockScheduleId,
        mockMemberId,
        updateDto,
      );

      expect(result).toEqual(mockResponse);
      expect(service.update).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        mockMemberId,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove schedule member successfully', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockScheduledAreaId, mockScheduleId, mockMemberId);

      expect(service.remove).toHaveBeenCalledWith(
        mockScheduledAreaId,
        mockScheduleId,
        mockMemberId,
      );
    });
  });
});






