import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleGenerationService } from 'src/basic/automatic-schedule/services/schedule-generation.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClient,
  createMockSupabaseService,
  createMockGenerationConfigurationDto,
  createMockScheduleGenerationResponseDto,
  createMockGenerationPreviewDto,
} from '../../mocks';
import { GenerationType, PeriodType } from 'src/basic/automatic-schedule/dto/generation-configuration.dto';

describe('ScheduleGenerationService', () => {
  let service: ScheduleGenerationService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockGenerationId = faker.string.uuid();
  const mockUserId = faker.string.uuid();

  const mockSupabaseService = createMockSupabaseService();
  const mockClient = createMockSupabaseClient();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleGenerationService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduleGenerationService>(ScheduleGenerationService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock client and clear all mock return values
    mockClient.from.mockClear();
    (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('preview', () => {
    const config = createMockGenerationConfigurationDto({
      scheduledAreaId: mockScheduledAreaId,
      generationType: GenerationType.GROUP,
      periodType: PeriodType.DAILY,
      periodStartDate: '2025-01-01',
      periodEndDate: '2025-01-05', // Apenas 5 dias para reduzir número de chamadas
    });

    it('should generate preview successfully', async () => {
      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'area_groups') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: config.groupConfig!.groupIds[0],
                      name: 'Grupo A',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        
        return {
          select: jest.fn(),
          insert: jest.fn(),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.preview(mockScheduledAreaId, config);

      expect(result).toBeDefined();
      expect(result.configuration).toEqual(config);
      expect(result.schedules).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should throw NotFoundException if scheduled area does not exist', async () => {
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(service.preview(mockScheduledAreaId, config)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if periodStartDate is after periodEndDate', async () => {
      const invalidConfig = createMockGenerationConfigurationDto({
        scheduledAreaId: mockScheduledAreaId,
        periodStartDate: '2025-01-31',
        periodEndDate: '2025-01-01',
      });

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockScheduledAreaId },
              error: null,
            }),
          }),
        }),
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(service.preview(mockScheduledAreaId, invalidConfig)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if groupConfig is missing for group generation type', async () => {
      // Criar config manualmente para garantir que groupConfig seja realmente undefined
      const invalidConfig: GenerationConfigurationDto = {
        scheduledAreaId: mockScheduledAreaId,
        generationType: GenerationType.GROUP,
        periodType: PeriodType.DAILY,
        periodStartDate: '2025-01-01',
        periodEndDate: '2025-01-31',
        groupConfig: undefined, // Explicitamente undefined
        peopleConfig: undefined,
        teamConfig: undefined,
        periodConfig: {
          weekdays: [1, 2, 3, 4, 5],
          startTime: '08:00',
          endTime: '17:00',
          excludedDates: [],
          includedDates: [],
        },
      };

      // Mock scheduled area validation (será chamado antes da validação do groupConfig)
      // A validação do groupConfig acontece em validateConfiguration, que é chamado ANTES de generatePreviewSchedules
      // Então não precisamos mockar area_groups porque a exceção deve ser lançada antes
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Fallback - não deve ser chamado porque validateConfiguration deve lançar exceção antes
        // Mas vamos mockar caso o código chegue aqui por algum motivo
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(service.preview(mockScheduledAreaId, invalidConfig)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    const config = createMockGenerationConfigurationDto({
      scheduledAreaId: mockScheduledAreaId,
      generationType: GenerationType.GROUP,
      periodType: PeriodType.DAILY,
      periodStartDate: '2025-01-01',
      periodEndDate: '2025-01-05', // Apenas 5 dias para reduzir número de chamadas
    });

    it('should create schedule generation successfully', async () => {
      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'area_groups') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: config.groupConfig!.groupIds[0],
                      name: 'Grupo A',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_generations') {
          const mockGenerationData = {
            id: mockGenerationId,
            scheduled_area_id: mockScheduledAreaId,
            generation_type: config.generationType,
            period_type: config.periodType,
            period_start_date: config.periodStartDate,
            period_end_date: config.periodEndDate,
            configuration: config,
            total_schedules_generated: 0,
            created_at: new Date().toISOString(),
            created_by: mockUserId,
          };
          
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGenerationData,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        
        if (table === 'schedules') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: faker.string.uuid() },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_groups') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        
        // Fallback
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn(),
            in: jest.fn(),
          }),
          insert: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.create(mockScheduledAreaId, config, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockGenerationId);
      expect(result.scheduledAreaId).toBe(mockScheduledAreaId);
    });

    it('should throw BadRequestException if preview has errors', async () => {
      // Mock scheduled area validation (chamado pelo create antes do preview)
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn(),
            in: jest.fn(),
          }),
          insert: jest.fn(),
        };
      });

      // The preview will have errors, so create should fail
      // We need to mock the preview to return errors
      const previewSpy = jest.spyOn(service, 'preview').mockResolvedValue(
        createMockGenerationPreviewDto({
          summary: {
            totalSchedules: 0,
            totalParticipants: 0,
            warnings: 0,
            errors: 1,
            distributionBalance: 'critical',
          },
        }),
      );

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(service.create(mockScheduledAreaId, config, mockUserId)).rejects.toThrow(
        BadRequestException,
      );

      previewSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('should return paginated list of schedule generations', async () => {
      const mockGenerations = [
        createMockScheduleGenerationResponseDto({
          scheduledAreaId: mockScheduledAreaId,
        }),
      ];

      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_generations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: mockGenerations[0].id,
                        scheduled_area_id: mockGenerations[0].scheduledAreaId,
                        generation_type: mockGenerations[0].generationType,
                        period_type: mockGenerations[0].periodType,
                        period_start_date: mockGenerations[0].periodStartDate,
                        period_end_date: mockGenerations[0].periodEndDate,
                        configuration: mockGenerations[0].configuration,
                        total_schedules_generated: mockGenerations[0].totalSchedulesGenerated,
                        created_at: mockGenerations[0].createdAt,
                        created_by: mockGenerations[0].createdBy,
                      },
                    ],
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          };
        }
        
        return { select: jest.fn() };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.findAll(mockScheduledAreaId, 1, 10);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return schedule generation by id', async () => {
      const mockGeneration = createMockScheduleGenerationResponseDto({
        id: mockGenerationId,
        scheduledAreaId: mockScheduledAreaId,
      });

      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_generations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockGeneration.id,
                      scheduled_area_id: mockGeneration.scheduledAreaId,
                      generation_type: mockGeneration.generationType,
                      period_type: mockGeneration.periodType,
                      period_start_date: mockGeneration.periodStartDate,
                      period_end_date: mockGeneration.periodEndDate,
                      configuration: mockGeneration.configuration,
                      total_schedules_generated: mockGeneration.totalSchedulesGenerated,
                      created_at: mockGeneration.createdAt,
                      created_by: mockGeneration.createdBy,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        
        return { select: jest.fn() };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      const result = await service.findOne(mockScheduledAreaId, mockGenerationId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockGenerationId);
    });

    it('should throw NotFoundException if generation not found', async () => {
      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_generations') {
          return {
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
          };
        }
        
        return { select: jest.fn() };
      });

      (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);

      await expect(
        service.findOne(mockScheduledAreaId, mockGenerationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete schedule generation successfully', async () => {
      let scheduleGenerationsCallCount = 0;
      
      // Configurar mock que retorna diferentes valores baseado na tabela chamada
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockScheduledAreaId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'schedule_generations') {
          scheduleGenerationsCallCount++;
          
          // Primeira chamada: findOne query (dentro do remove)
          if (scheduleGenerationsCallCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: mockGenerationId,
                        scheduled_area_id: mockScheduledAreaId,
                        generation_type: 'group',
                        period_type: 'daily',
                        period_start_date: '2025-01-01',
                        period_end_date: '2025-01-31',
                        configuration: {},
                        total_schedules_generated: 0,
                        created_at: new Date().toISOString(),
                        created_by: mockUserId,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          
          // Segunda chamada: delete
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
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

      await service.remove(mockScheduledAreaId, mockGenerationId);

      expect(mockClient.from).toHaveBeenCalledWith('schedule_generations');
    });
  });
});

