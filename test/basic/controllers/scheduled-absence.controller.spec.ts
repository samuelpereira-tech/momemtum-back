import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScheduledAbsenceController } from 'src/basic/scheduled-absence/controllers/scheduled-absence.controller';
import { ScheduledAbsenceService } from 'src/basic/scheduled-absence/services/scheduled-absence.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/create-scheduled-absence.dto';
import { UpdateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/update-scheduled-absence.dto';
import { faker } from '@faker-js/faker';
import {
  createMockScheduledAbsenceResponse,
  createMockScheduledAbsenceService,
  createMockCreateScheduledAbsenceDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('ScheduledAbsenceController', () => {
  let controller: ScheduledAbsenceController;
  let service: ScheduledAbsenceService;

  const mockScheduledAbsenceId = faker.string.uuid();
  const mockScheduledAbsenceResponse = createMockScheduledAbsenceResponse({ id: mockScheduledAbsenceId });
  const mockPaginatedResponse = {
    data: [mockScheduledAbsenceResponse],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  };

  const mockScheduledAbsenceService = createMockScheduledAbsenceService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledAbsenceController],
      providers: [
        {
          provide: ScheduledAbsenceService,
          useValue: mockScheduledAbsenceService,
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

    controller = module.get<ScheduledAbsenceController>(
      ScheduledAbsenceController,
    );
    service = module.get<ScheduledAbsenceService>(ScheduledAbsenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a scheduled absence', async () => {
      const createScheduledAbsenceDto = createMockCreateScheduledAbsenceDto({
        personId: mockScheduledAbsenceResponse.personId,
        absenceTypeId: mockScheduledAbsenceResponse.absenceTypeId,
        startDate: mockScheduledAbsenceResponse.startDate,
        endDate: mockScheduledAbsenceResponse.endDate,
        description: mockScheduledAbsenceResponse.description,
      });

      mockScheduledAbsenceService.create.mockResolvedValue(
        mockScheduledAbsenceResponse,
      );

      const result = await controller.create(createScheduledAbsenceDto);

      expect(mockScheduledAbsenceService.create).toHaveBeenCalledWith(
        createScheduledAbsenceDto,
      );
      expect(result).toEqual(mockScheduledAbsenceResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of scheduled absences', async () => {
      mockScheduledAbsenceService.findAll.mockResolvedValue(
        mockPaginatedResponse,
      );

      const result = await controller.findAll(
        '1',
        '10',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(mockScheduledAbsenceService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      mockScheduledAbsenceService.findAll.mockResolvedValue(
        mockPaginatedResponse,
      );

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(mockScheduledAbsenceService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle filters correctly', async () => {
      mockScheduledAbsenceService.findAll.mockResolvedValue(
        mockPaginatedResponse,
      );

      const result = await controller.findAll(
        '1',
        '10',
        'person-id',
        'João',
        'type-id',
        '2024-12-01',
        '2024-12-31',
        '2024-12-01,2024-12-31',
      );

      expect(mockScheduledAbsenceService.findAll).toHaveBeenCalledWith(
        1,
        10,
        'person-id',
        'João',
        'type-id',
        '2024-12-01',
        '2024-12-31',
        '2024-12-01,2024-12-31',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should limit max items per page to 100', async () => {
      mockScheduledAbsenceService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        limit: 100,
      });

      const result = await controller.findAll(
        '1',
        '200',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(mockScheduledAbsenceService.findAll).toHaveBeenCalledWith(
        1,
        100,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result.limit).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return a scheduled absence by id', async () => {
      const scheduledAbsenceId = mockScheduledAbsenceId;

      mockScheduledAbsenceService.findOne.mockResolvedValue(
        mockScheduledAbsenceResponse,
      );

      const result = await controller.findOne(scheduledAbsenceId);

      expect(mockScheduledAbsenceService.findOne).toHaveBeenCalledWith(
        scheduledAbsenceId,
      );
      expect(result).toEqual(mockScheduledAbsenceResponse);
    });
  });

  describe('update', () => {
    it('should update a scheduled absence', async () => {
      const scheduledAbsenceId = mockScheduledAbsenceId;
      const updateScheduledAbsenceDto: UpdateScheduledAbsenceDto = {
        startDate: '2024-12-25',
        endDate: '2025-01-15',
      };

      const updatedScheduledAbsence = {
        ...mockScheduledAbsenceResponse,
        startDate: '2024-12-25',
        endDate: '2025-01-15',
      };

      mockScheduledAbsenceService.update.mockResolvedValue(
        updatedScheduledAbsence,
      );

      const result = await controller.update(
        scheduledAbsenceId,
        updateScheduledAbsenceDto,
      );

      expect(mockScheduledAbsenceService.update).toHaveBeenCalledWith(
        scheduledAbsenceId,
        updateScheduledAbsenceDto,
      );
      expect(result).toEqual(updatedScheduledAbsence);
      expect(result.startDate).toBe('2024-12-25');
    });
  });

  describe('remove', () => {
    it('should delete a scheduled absence', async () => {
      const scheduledAbsenceId = mockScheduledAbsenceId;

      mockScheduledAbsenceService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(scheduledAbsenceId);

      expect(mockScheduledAbsenceService.remove).toHaveBeenCalledWith(
        scheduledAbsenceId,
      );
      expect(result).toEqual({
        message: 'Scheduled absence deleted successfully',
      });
    });
  });
});

