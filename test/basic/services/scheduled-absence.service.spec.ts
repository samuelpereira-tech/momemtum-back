import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledAbsenceService } from 'src/basic/scheduled-absence/services/scheduled-absence.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/create-scheduled-absence.dto';
import { UpdateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/update-scheduled-absence.dto';

describe('ScheduledAbsenceService', () => {
  let service: ScheduledAbsenceService;
  let supabaseService: SupabaseService;

  const mockPersonId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAbsenceTypeId = '456e7890-e89b-12d3-a456-426614174001';
  const mockScheduledAbsenceId = '789e0123-e89b-12d3-a456-426614174002';

  const mockScheduledAbsenceData = {
    id: mockScheduledAbsenceId,
    person_id: mockPersonId,
    absence_type_id: mockAbsenceTypeId,
    start_date: '2024-12-20',
    end_date: '2025-01-10',
    description: 'Férias de fim de ano',
    created_at: '2024-12-01T10:30:00.000Z',
    updated_at: '2024-12-01T10:30:00.000Z',
    person: {
      id: mockPersonId,
      full_name: 'João Silva',
      email: 'joao.silva@example.com',
    },
    absence_type: {
      id: mockAbsenceTypeId,
      name: 'Férias',
      color: '#79D9C7',
    },
  };

  const mockScheduledAbsenceResponse = {
    id: mockScheduledAbsenceId,
    personId: mockPersonId,
    absenceTypeId: mockAbsenceTypeId,
    startDate: '2024-12-20',
    endDate: '2025-01-10',
    description: 'Férias de fim de ano',
    createdAt: '2024-12-01T10:30:00.000Z',
    updatedAt: '2024-12-01T10:30:00.000Z',
    person: {
      id: mockPersonId,
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
    },
    absenceType: {
      id: mockAbsenceTypeId,
      name: 'Férias',
      color: '#79D9C7',
    },
  };

  const createMockSupabaseClient = () => {
    return {
      from: jest.fn(),
    };
  };

  const mockSupabaseService = {
    getRawClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledAbsenceService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduledAbsenceService>(ScheduledAbsenceService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createScheduledAbsenceDto: CreateScheduledAbsenceDto = {
      personId: mockPersonId,
      absenceTypeId: mockAbsenceTypeId,
      startDate: '2024-12-20',
      endDate: '2025-01-10',
      description: 'Férias de fim de ano',
    };

    it('should create a scheduled absence successfully', async () => {
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

      // Mock absence type check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockAbsenceTypeId, active: true },
            }),
          }),
        }),
      });

      // Mock overlap check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [],
              }),
            }),
          }),
        }),
      });

      // Mock insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAbsenceData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(createScheduledAbsenceDto);

      expect(result).toEqual(mockScheduledAbsenceResponse);
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      const invalidDto: CreateScheduledAbsenceDto = {
        personId: mockPersonId,
        absenceTypeId: mockAbsenceTypeId,
        startDate: '2025-01-10',
        endDate: '2024-12-20',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        'endDate must be greater than or equal to startDate',
      );
    });

    it('should throw NotFoundException if person not found', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        'Person not found',
      );
    });

    it('should throw NotFoundException if absence type not found', async () => {
      const mockClient = createMockSupabaseClient();

      // Person exists
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockPersonId },
            }),
          }),
        }),
      });

      // Absence type not found
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

      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        'Absence type not found',
      );
    });

    it('should throw BadRequestException if absence type is inactive', async () => {
      const mockClient = createMockSupabaseClient();

      // Person exists
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockPersonId },
            }),
          }),
        }),
      });

      // Absence type is inactive
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockAbsenceTypeId, active: false },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        'Cannot create scheduled absence with inactive absence type',
      );
    });

    it('should throw ConflictException if dates overlap', async () => {
      const mockClient = createMockSupabaseClient();

      // Person exists
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockPersonId },
            }),
          }),
        }),
      });

      // Absence type exists and is active
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockAbsenceTypeId, active: true },
            }),
          }),
        }),
      });

      // Overlap check - has overlapping absence
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [{ id: 'existing-absence-id' }],
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createScheduledAbsenceDto)).rejects.toThrow(
        'Overlapping absence dates for the same person',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of scheduled absences', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockScheduledAbsenceData],
                error: null,
                count: 1,
              }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [mockScheduledAbsenceData],
              error: null,
              count: 1,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by personId', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockScheduledAbsenceData],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, mockPersonId);

      expect(result.data).toHaveLength(1);
    });

    it('should filter by personName', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock person search
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockResolvedValue({
            data: [{ id: mockPersonId }],
          }),
        }),
      });

      // Mock scheduled absences query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockScheduledAbsenceData],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, undefined, 'João');

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a scheduled absence by id', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAbsenceData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(mockScheduledAbsenceId);

      expect(result).toEqual(mockScheduledAbsenceResponse);
      expect(result.id).toBe(mockScheduledAbsenceId);
    });

    it('should throw NotFoundException if scheduled absence not found', async () => {
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

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Scheduled absence not found',
      );
    });
  });

  describe('update', () => {
    const updateScheduledAbsenceDto: UpdateScheduledAbsenceDto = {
      startDate: '2024-12-25',
      endDate: '2025-01-15',
    };

    it('should update a scheduled absence successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAbsenceData,
              error: null,
            }),
          }),
        }),
      });

      // Mock overlap check
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                neq: jest.fn().mockResolvedValue({
                  data: [],
                }),
              }),
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
                  ...mockScheduledAbsenceData,
                  start_date: '2024-12-25',
                  end_date: '2025-01-15',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(
        mockScheduledAbsenceId,
        updateScheduledAbsenceDto,
      );

      expect(result.startDate).toBe('2024-12-25');
      expect(result.endDate).toBe('2025-01-15');
    });

    it('should throw ConflictException if dates overlap', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAbsenceData,
              error: null,
            }),
          }),
        }),
      });

      // Mock overlap check - has overlap
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                neq: jest.fn().mockResolvedValue({
                  data: [{ id: 'other-absence-id' }],
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.update(mockScheduledAbsenceId, updateScheduledAbsenceDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled absence successfully', async () => {
      const mockClient = createMockSupabaseClient();

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduledAbsenceData,
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

      await expect(service.remove(mockScheduledAbsenceId)).resolves.not.toThrow();
    });
  });
});

