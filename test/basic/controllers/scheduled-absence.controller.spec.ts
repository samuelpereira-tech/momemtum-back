import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScheduledAbsenceController } from 'src/basic/scheduled-absence/controllers/scheduled-absence.controller';
import { ScheduledAbsenceService } from 'src/basic/scheduled-absence/services/scheduled-absence.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/create-scheduled-absence.dto';
import { UpdateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/update-scheduled-absence.dto';
import {
  ScheduledAbsenceResponseDto,
  PaginatedScheduledAbsenceResponseDto,
} from 'src/basic/scheduled-absence/dto/scheduled-absence-response.dto';

describe('ScheduledAbsenceController', () => {
  let controller: ScheduledAbsenceController;
  let service: ScheduledAbsenceService;

  const mockScheduledAbsenceResponse: ScheduledAbsenceResponseDto = {
    id: '789e0123-e89b-12d3-a456-426614174002',
    personId: '123e4567-e89b-12d3-a456-426614174000',
    absenceTypeId: '456e7890-e89b-12d3-a456-426614174001',
    startDate: '2024-12-20',
    endDate: '2025-01-10',
    description: 'Férias de fim de ano',
    createdAt: '2024-12-01T10:30:00.000Z',
    updatedAt: '2024-12-01T10:30:00.000Z',
    person: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
    },
    absenceType: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      name: 'Férias',
      color: '#79D9C7',
    },
  };

  const mockPaginatedResponse: PaginatedScheduledAbsenceResponseDto = {
    data: [mockScheduledAbsenceResponse],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  };

  const mockScheduledAbsenceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      const createScheduledAbsenceDto: CreateScheduledAbsenceDto = {
        personId: '123e4567-e89b-12d3-a456-426614174000',
        absenceTypeId: '456e7890-e89b-12d3-a456-426614174001',
        startDate: '2024-12-20',
        endDate: '2025-01-10',
        description: 'Férias de fim de ano',
      };

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
      const scheduledAbsenceId = '789e0123-e89b-12d3-a456-426614174002';

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
      const scheduledAbsenceId = '789e0123-e89b-12d3-a456-426614174002';
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
      const scheduledAbsenceId = '789e0123-e89b-12d3-a456-426614174002';

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

