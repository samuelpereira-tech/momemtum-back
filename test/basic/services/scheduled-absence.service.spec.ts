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
import { faker } from '@faker-js/faker';

describe('ScheduledAbsenceService', () => {
  let service: ScheduledAbsenceService;
  let supabaseService: SupabaseService;

  const mockPersonId = faker.string.uuid();
  const mockAbsenceTypeId = faker.string.uuid();
  const mockScheduledAbsenceId = faker.string.uuid();

  const startDate = faker.date.future().toISOString().split('T')[0];
  const endDate = faker.date.future({ refDate: startDate }).toISOString().split('T')[0];

  const mockScheduledAbsenceData = {
    id: mockScheduledAbsenceId,
    person_id: mockPersonId,
    absence_type_id: mockAbsenceTypeId,
    start_date: startDate,
    end_date: endDate,
    description: faker.lorem.sentence(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    person: {
      id: mockPersonId,
      full_name: faker.person.fullName(),
      email: faker.internet.email(),
    },
    absence_type: {
      id: mockAbsenceTypeId,
      name: faker.lorem.word(),
      color: faker.color.rgb(),
    },
  };

  const mockScheduledAbsenceResponse = {
    id: mockScheduledAbsenceId,
    personId: mockPersonId,
    absenceTypeId: mockAbsenceTypeId,
    startDate: mockScheduledAbsenceData.start_date,
    endDate: mockScheduledAbsenceData.end_date,
    description: mockScheduledAbsenceData.description,
    createdAt: mockScheduledAbsenceData.created_at,
    updatedAt: mockScheduledAbsenceData.updated_at,
    person: {
      id: mockPersonId,
      fullName: mockScheduledAbsenceData.person.full_name,
      email: mockScheduledAbsenceData.person.email,
    },
    absenceType: {
      id: mockAbsenceTypeId,
      name: mockScheduledAbsenceData.absence_type.name,
      color: mockScheduledAbsenceData.absence_type.color,
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
      startDate: mockScheduledAbsenceData.start_date,
      endDate: mockScheduledAbsenceData.end_date,
      description: mockScheduledAbsenceData.description,
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
      const futureDate = faker.date.future().toISOString().split('T')[0];
      const pastDate = faker.date.past().toISOString().split('T')[0];
      const invalidDto: CreateScheduledAbsenceDto = {
        personId: mockPersonId,
        absenceTypeId: mockAbsenceTypeId,
        startDate: futureDate,
        endDate: pastDate,
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

      // Mock scheduled absences query (called first to create the base query)
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

      // Mock person search - from('persons').select('id').ilike(...)
      const mockIlike = jest.fn().mockResolvedValue({
        data: [{ id: mockPersonId }],
      });
      const mockSelect = jest.fn().mockReturnValue({
        ilike: mockIlike,
      });
      mockClient.from.mockReturnValueOnce({
        select: mockSelect,
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, undefined, 'João');

      expect(result.data).toHaveLength(1);
      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(mockIlike).toHaveBeenCalledWith('full_name', '%João%');
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

      const nonExistentId = faker.string.uuid();
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
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

