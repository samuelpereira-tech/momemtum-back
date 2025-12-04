import { Test, TestingModule } from '@nestjs/testing';
import { AbsenceTypeService } from 'src/basic/scheduled-absence/services/absence-type.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/update-absence-type.dto';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClientWithoutStorage,
  createMockSupabaseService,
  createMockAbsenceTypeData,
  createMockAbsenceTypeResponse,
  createMockCreateAbsenceTypeDto,
} from '../../mocks';

describe('AbsenceTypeService', () => {
  let service: AbsenceTypeService;
  let supabaseService: SupabaseService;

  const mockAbsenceTypeId = faker.string.uuid();
  const mockAbsenceTypeData = createMockAbsenceTypeData({ id: mockAbsenceTypeId });
  const mockAbsenceTypeResponse = createMockAbsenceTypeResponse({
    id: mockAbsenceTypeId,
    name: mockAbsenceTypeData.name,
    description: mockAbsenceTypeData.description,
    color: mockAbsenceTypeData.color,
    active: mockAbsenceTypeData.active,
    createdAt: mockAbsenceTypeData.created_at,
    updatedAt: mockAbsenceTypeData.updated_at,
  });

  const mockSupabaseService = createMockSupabaseService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbsenceTypeService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AbsenceTypeService>(AbsenceTypeService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAbsenceTypeDto = createMockCreateAbsenceTypeDto({
      name: mockAbsenceTypeData.name,
      description: mockAbsenceTypeData.description,
      color: mockAbsenceTypeData.color,
      active: mockAbsenceTypeData.active,
    });

    it('should create an absence type successfully', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();

      // Mock name check - no existing name
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      // Mock insert
      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAbsenceTypeData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(createAbsenceTypeDto);

      expect(result).toEqual(mockAbsenceTypeResponse);
      expect(mockClient.from).toHaveBeenCalledWith('absence_types');
    });

    it('should throw ConflictException if name already exists', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: faker.string.uuid() },
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.create(createAbsenceTypeDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createAbsenceTypeDto)).rejects.toThrow(
        'Absence type with this name already exists',
      );
    });

    it('should use default color if not provided', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const dtoWithoutColor: CreateAbsenceTypeDto = {
        name: 'Feriado',
      };

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockAbsenceTypeData, color: '#AD82D9', name: 'Feriado' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(dtoWithoutColor);

      expect(result.color).toBe('#AD82D9');
    });
  });

  describe('findAll', () => {
    it('should return paginated list of absence types', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const mockData = [mockAbsenceTypeData];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockData,
                  error: null,
                  count: 1,
                }),
              }),
            }),
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockData,
                error: null,
                count: 1,
              }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockData,
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
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by name', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockAbsenceTypeData],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, 'Férias');

      expect(result.data).toHaveLength(1);
    });

    it('should filter by active status', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [mockAbsenceTypeData],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(1, 10, undefined, true);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an absence type by id', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAbsenceTypeData,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(mockAbsenceTypeId);

      expect(result).toEqual(mockAbsenceTypeResponse);
      expect(result.id).toBe(mockAbsenceTypeId);
    });

    it('should throw NotFoundException if absence type not found', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = faker.string.uuid();

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

      await expect(service.findOne(absenceTypeId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(absenceTypeId)).rejects.toThrow(
        'Absence type not found',
      );
    });
  });

  describe('update', () => {
    const updateAbsenceTypeDto: UpdateAbsenceTypeDto = {
      name: 'Férias Atualizado',
      description: 'Nova descrição',
    };

    it('should update an absence type successfully', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAbsenceTypeData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // name check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // update
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      ...mockAbsenceTypeData,
                      name: 'Férias Atualizado',
                      description: 'Nova descrição',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(absenceTypeId, updateAbsenceTypeDto);

      expect(result.name).toBe('Férias Atualizado');
      expect(result.description).toBe('Nova descrição');
    });

    it('should throw NotFoundException if absence type not found', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = faker.string.uuid();

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

      await expect(
        service.update(absenceTypeId, updateAbsenceTypeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if name already exists', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;
      const updateDto: UpdateAbsenceTypeDto = {
        name: 'Existing Name',
      };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAbsenceTypeData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // name check - name exists
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'other-id' },
                  }),
                }),
              }),
            }),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.update(absenceTypeId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an absence type successfully', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAbsenceTypeData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2 && table === 'scheduled_absences') {
          // Check for scheduled absences
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // delete
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.remove(absenceTypeId)).resolves.not.toThrow();
    });

    it('should throw ConflictException if absence type is in use', async () => {
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAbsenceTypeData,
                  error: null,
                }),
              }),
            }),
          };
        } else if (callCount === 2 && table === 'scheduled_absences') {
          // Check for scheduled absences - has absences
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'some-absence-id' }],
                }),
              }),
            }),
          };
        } else if (callCount === 2 && table === 'absence_types') {
          // This shouldn't happen, but handle it
          return {
            select: jest.fn(),
          };
        }
        return {
          select: jest.fn(),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(service.remove(absenceTypeId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('toggle', () => {
    it('should toggle active status from true to false', async () => {
      // Toggle calls findOne then update, so we can just test that it calls update with correct params
      // We'll mock findOne to return the current state, then mock update
      const mockClient = createMockSupabaseClientWithoutStorage();
      const absenceTypeId = mockAbsenceTypeId;

      // Mock findOne (called by toggle)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAbsenceTypeData,
              error: null,
            }),
          }),
        }),
      });

      // Mock findOne (called by update)
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAbsenceTypeData,
              error: null,
            }),
          }),
        }),
      });

      // Mock update - this is the 3rd call to from()
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockAbsenceTypeData, active: false },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.toggle(absenceTypeId);

      expect(result.active).toBe(false);
    });
  });
});

