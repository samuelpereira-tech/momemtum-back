import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from 'src/basic/automatic-schedule/services/schedule.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClient,
  createMockSupabaseService,
  createMockScheduleResponseDto,
  createMockScheduleDetailsResponseDto,
  createMockCreateScheduleDto,
  createMockUpdateScheduleDto,
} from '../../mocks';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();

  const mockSupabaseService = createMockSupabaseService();
  const mockClient = createMockSupabaseClient();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock client
    (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = createMockCreateScheduleDto({
      scheduledAreaId: mockScheduledAreaId,
      scheduleType: 'group',
    });

    it('should create a schedule successfully', async () => {
      const mockScheduleData = {
        id: mockScheduleId,
        schedule_generation_id: null,
        scheduled_area_id: mockScheduledAreaId,
        start_datetime: createDto.startDatetime,
        end_datetime: createDto.endDatetime,
        schedule_type: createDto.scheduleType,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock schedule insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScheduleData,
              error: null,
            }),
          }),
        }),
      });

      // Mock schedule_groups insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock count participants (schedule_members) - chamado no findOne dentro do create
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 5,
            data: null,
            error: null,
          }),
        }),
      });
      // Mock count participants (schedule_members) - chamado no findOne dentro do create
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.create(mockScheduledAreaId, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScheduleId);
      expect(result.scheduledAreaId).toBe(mockScheduledAreaId);
    });

    it('should throw BadRequestException if endDatetime is before startDatetime', async () => {
      const invalidDto = createMockCreateScheduleDto({
        scheduledAreaId: mockScheduledAreaId,
        startDatetime: '2025-01-01T17:00:00.000Z',
        endDatetime: '2025-01-01T08:00:00.000Z',
      });

      await expect(service.create(mockScheduledAreaId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if groupIds is missing for group type', async () => {
      const invalidDto = createMockCreateScheduleDto({
        scheduledAreaId: mockScheduledAreaId,
        scheduleType: 'group',
        groupIds: undefined,
      });

      await expect(service.create(mockScheduledAreaId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return schedule with details', async () => {
      const mockSchedule = createMockScheduleDetailsResponseDto({
        id: mockScheduleId,
        scheduledAreaId: mockScheduledAreaId,
      });

      // Mock schedule query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockSchedule.id,
                  schedule_generation_id: mockSchedule.scheduleGenerationId,
                  scheduled_area_id: mockSchedule.scheduledAreaId,
                  start_datetime: mockSchedule.startDatetime,
                  end_datetime: mockSchedule.endDatetime,
                  schedule_type: mockSchedule.scheduleType,
                  status: mockSchedule.status,
                  created_at: mockSchedule.createdAt,
                  updated_at: mockSchedule.updatedAt,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock getScheduleDetails queries
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
          }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
          }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
          }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
            }),
          }),
        }),
      });

      // Mock count participants (schedule_members)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 3,
            data: null,
            error: null,
          }),
        }),
      });
      // Mock count participants (schedule_members)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 2,
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.findOne(mockScheduledAreaId, mockScheduleId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScheduleId);
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(service.findOne(mockScheduledAreaId, mockScheduleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleDto({
      status: 'confirmed',
    });

    it('should update schedule successfully', async () => {
      const mockSchedule = createMockScheduleResponseDto({
        id: mockScheduleId,
        scheduledAreaId: mockScheduledAreaId,
        scheduleGenerationId: null, // Manual schedule
      });

      // Configurar mock baseado na tabela
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockSchedule.id,
                      schedule_generation_id: mockSchedule.scheduleGenerationId,
                      scheduled_area_id: mockSchedule.scheduledAreaId,
                      start_datetime: mockSchedule.startDatetime,
                      end_datetime: mockSchedule.endDatetime,
                      schedule_type: mockSchedule.scheduleType,
                      status: mockSchedule.status,
                      created_at: mockSchedule.createdAt,
                      updated_at: mockSchedule.updatedAt,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        ...mockSchedule,
                        status: 'confirmed',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }
        
        if (table === 'schedule_teams') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        
        
        if (table === 'schedule_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                count: 3,
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'schedule_comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn(),
          }),
          update: jest.fn(),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.update(mockScheduledAreaId, mockScheduleId, updateDto);

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
    });

    it('should throw BadRequestException if trying to update datetime of automatic schedule', async () => {
      const mockSchedule = createMockScheduleResponseDto({
        id: mockScheduleId,
        scheduledAreaId: mockScheduledAreaId,
        scheduleGenerationId: faker.string.uuid(), // Automatic schedule
      });

      const invalidUpdateDto = createMockUpdateScheduleDto({
        startDatetime: '2025-01-01T09:00:00.000Z',
      });

      // Configurar mock baseado na tabela
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockSchedule.id,
                      schedule_generation_id: mockSchedule.scheduleGenerationId,
                      scheduled_area_id: mockSchedule.scheduledAreaId,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }
        
        if (table === 'schedule_teams') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        
        
        if (table === 'schedule_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                count: 0,
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'schedule_comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn(),
          }),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(
        service.update(mockScheduledAreaId, mockScheduleId, invalidUpdateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete manual schedule successfully', async () => {
      const mockSchedule = createMockScheduleResponseDto({
        id: mockScheduleId,
        scheduledAreaId: mockScheduledAreaId,
        scheduleGenerationId: null, // Manual schedule
      });

      // Configurar mock baseado na tabela
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockSchedule.id,
                      schedule_generation_id: mockSchedule.scheduleGenerationId,
                      scheduled_area_id: mockSchedule.scheduledAreaId,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_groups') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }
        
        if (table === 'schedule_teams') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        
        
        if (table === 'schedule_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                count: 0,
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'schedule_comments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn(),
          }),
          delete: jest.fn(),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await service.remove(mockScheduledAreaId, mockScheduleId);

      expect(mockClient.from).toHaveBeenCalledWith('schedules');
    });

    it('should throw BadRequestException if trying to delete automatic schedule', async () => {
      const mockSchedule = createMockScheduleResponseDto({
        id: mockScheduleId,
        scheduledAreaId: mockScheduledAreaId,
        scheduleGenerationId: faker.string.uuid(), // Automatic schedule
      });

      // Mock findOne
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockSchedule.id,
                  schedule_generation_id: mockSchedule.scheduleGenerationId,
                  scheduled_area_id: mockSchedule.scheduledAreaId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock getScheduleDetails
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      });

      await expect(service.remove(mockScheduledAreaId, mockScheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

