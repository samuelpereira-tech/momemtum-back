import { Test, TestingModule } from '@nestjs/testing';
import { AbsenceTypeService } from 'src/basic/scheduled-absence/services/absence-type.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/update-absence-type.dto';

describe('AbsenceTypeService', () => {
  let service: AbsenceTypeService;
  let supabaseService: SupabaseService;

  const mockAbsenceTypeData = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'Férias',
    description: 'Período de férias',
    color: '#79D9C7',
    active: true,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
  };

  const mockAbsenceTypeResponse = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'Férias',
    description: 'Período de férias',
    color: '#79D9C7',
    active: true,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
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
    const createAbsenceTypeDto: CreateAbsenceTypeDto = {
      name: 'Férias',
      description: 'Período de férias',
      color: '#79D9C7',
      active: true,
    };

    it('should create an absence type successfully', async () => {
      const mockClient = createMockSupabaseClient();

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
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-id' },
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
      const mockClient = createMockSupabaseClient();
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
      const mockClient = createMockSupabaseClient();
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
      const mockClient = createMockSupabaseClient();

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
      const mockClient = createMockSupabaseClient();

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

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

      const result = await service.findOne(absenceTypeId);

      expect(result).toEqual(mockAbsenceTypeResponse);
      expect(result.id).toBe(absenceTypeId);
    });

    it('should throw NotFoundException if absence type not found', async () => {
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = 'non-existent-id';

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = 'non-existent-id';

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';
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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

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
      const mockClient = createMockSupabaseClient();
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

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

