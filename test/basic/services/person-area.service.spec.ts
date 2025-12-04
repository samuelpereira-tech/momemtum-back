import { Test, TestingModule } from '@nestjs/testing';
import { PersonAreaService } from 'src/basic/person-area/services/person-area.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreatePersonAreaDto } from 'src/basic/person-area/dto/create-person-area.dto';
import { UpdatePersonAreaDto } from 'src/basic/person-area/dto/update-person-area.dto';

describe('PersonAreaService', () => {
  let service: PersonAreaService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
  const mockPersonId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPersonAreaId = 'abc12345-e89b-12d3-a456-426614174003';
  const mockResponsibilityId1 = '456e7890-e89b-12d3-a456-426614174001';
  const mockResponsibilityId2 = '789e0123-e89b-12d3-a456-426614174002';

  const mockPersonAreaData = {
    id: mockPersonAreaId,
    person_id: mockPersonId,
    scheduled_area_id: mockScheduledAreaId,
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    person: {
      id: mockPersonId,
      full_name: 'João Silva',
      email: 'joao.silva@example.com',
      photo_url: 'https://example.com/photos/person-123.jpg',
    },
    scheduled_area: {
      id: mockScheduledAreaId,
      name: 'Área de Produção',
    },
    responsibilities: [
      {
        responsibility: {
          id: mockResponsibilityId1,
          name: 'Operador',
          description: 'Responsável por operar equipamentos',
          image_url: 'https://example.com/images/responsibility-456.jpg',
        },
      },
    ],
  };

  const mockPersonAreaResponse = {
    id: mockPersonAreaId,
    personId: mockPersonId,
    person: {
      id: mockPersonId,
      fullName: 'João Silva',
      email: 'joao.silva@example.com',
      photoUrl: 'https://example.com/photos/person-123.jpg',
    },
    scheduledAreaId: mockScheduledAreaId,
    scheduledArea: {
      id: mockScheduledAreaId,
      name: 'Área de Produção',
    },
    responsibilities: [
      {
        id: mockResponsibilityId1,
        name: 'Operador',
        description: 'Responsável por operar equipamentos',
        imageUrl: 'https://example.com/images/responsibility-456.jpg',
      },
    ],
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const createMockSupabaseClient = () => {
    const mockFrom = jest.fn();
    return {
      from: mockFrom,
    };
  };

  const mockSupabaseService = {
    getRawClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonAreaService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<PersonAreaService>(PersonAreaService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPersonAreaDto: CreatePersonAreaDto = {
      personId: mockPersonId,
      responsibilityIds: [mockResponsibilityId1, mockResponsibilityId2],
    };

    it('should create person area association successfully', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas') {
          // Always return valid scheduled area check
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
        } else if (table === 'persons' && callCount === 2) {
          // Check person exists
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockPersonId },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'person_areas') {
          if (callCount === 3) {
            // Check if association already exists
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null, // No existing association
                      error: { code: 'PGRST116' },
                    }),
                  }),
                }),
              }),
            };
          } else if (callCount === 5) {
            // Insert person area
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockPersonAreaId,
                      person_id: mockPersonId,
                      scheduled_area_id: mockScheduledAreaId,
                      created_at: '2024-01-15T10:30:00.000Z',
                      updated_at: '2024-01-15T10:30:00.000Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          } else {
            // findOne call to return full data (any other call to person_areas)
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockPersonAreaData,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
        } else if (table === 'responsibilities' && callCount === 4) {
          // Check responsibilities exist and belong to area
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { id: mockResponsibilityId1 },
                    { id: mockResponsibilityId2 },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'person_area_responsibilities' && callCount === 6) {
          // Insert responsibilities
          return {
            insert: jest.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        // Default return for any other case
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              eq: jest.fn(),
            }),
            in: jest.fn(),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.create(mockScheduledAreaId, createPersonAreaDto);

      expect(result).toBeDefined();
      expect(result.personId).toBe(mockPersonId);
      expect(result.scheduledAreaId).toBe(mockScheduledAreaId);
    });

    it('should throw NotFoundException if scheduled area not found', async () => {
      const mockClient = createMockSupabaseClient();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'scheduled_areas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow('Scheduled area not found');
    });

    it('should throw BadRequestException if person not found', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas') {
          // Always return valid scheduled area
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
        } else if (table === 'persons' && callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        // Default return
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              eq: jest.fn(),
            }),
            in: jest.fn(),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow('Person not found');
    });

    it('should throw ConflictException if person already associated', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas') {
          // Always return valid scheduled area
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
        } else if (table === 'persons') {
          // Always return valid person
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockPersonId },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'person_areas') {
          // Always return existing association check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'existing-id' }, // Already exists
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // Default return
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              eq: jest.fn(),
            }),
            in: jest.fn(),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(
        'Person is already associated with this scheduled area',
      );
    });

    it('should throw BadRequestException if responsibilities do not belong to area', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas') {
          // Always return valid scheduled area
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
        } else if (table === 'persons') {
          // Always return valid person
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockPersonId },
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'person_areas') {
          // Check if association already exists - return null (no existing)
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
        } else if (table === 'responsibilities') {
          // Only one responsibility found (should be 2)
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ id: mockResponsibilityId1 }], // Only one
                  error: null,
                }),
              }),
            }),
          };
        }
        // Default return
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              eq: jest.fn(),
            }),
            in: jest.fn(),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockScheduledAreaId, createPersonAreaDto),
      ).rejects.toThrow(
        'One or more responsibilities do not exist or do not belong to this scheduled area',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of person areas', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [mockPersonAreaData],
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

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findAll(mockScheduledAreaId, 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException if scheduled area not found', async () => {
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

      await expect(
        service.findAll(mockScheduledAreaId, 1, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return person area by ID', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findOne(mockScheduledAreaId, mockPersonAreaId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPersonAreaId);
    });

    it('should throw NotFoundException if person area not found', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
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

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.findOne(mockScheduledAreaId, mockPersonAreaId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPersonId', () => {
    it('should return person area by person ID', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.findByPersonId(mockScheduledAreaId, mockPersonId);

      expect(result).toBeDefined();
      expect(result.personId).toBe(mockPersonId);
    });
  });

  describe('update', () => {
    const updatePersonAreaDto: UpdatePersonAreaDto = {
      responsibilityIds: [mockResponsibilityId1],
    };

    it('should update person responsibilities successfully', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
          // findOne check - scheduled area exists
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
        } else if (table === 'person_areas' && callCount === 2) {
          // findOne check - person area exists (first call in update)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'responsibilities' && callCount === 3) {
          // Check responsibilities
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ id: mockResponsibilityId1 }],
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'person_area_responsibilities' && callCount === 4) {
          // Delete old responsibilities
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        } else if (table === 'person_area_responsibilities' && callCount === 5) {
          // Insert new responsibilities
          return {
            insert: jest.fn().mockResolvedValue({
              error: null,
            }),
          };
        } else if (table === 'person_areas' && callCount === 6) {
          // Update updated_at
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        } else if (table === 'scheduled_areas' && callCount === 7) {
          // findOne check - scheduled area exists (second call in findOne)
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
        } else if (table === 'person_areas' && callCount === 8) {
          // findOne to return updated data
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
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
          update: jest.fn(),
          delete: jest.fn(),
          insert: jest.fn(),
        };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      const result = await service.update(
        mockScheduledAreaId,
        mockPersonAreaId,
        updatePersonAreaDto,
      );

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if responsibilities do not belong to area', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'responsibilities' && callCount === 3) {
          // No responsibilities found
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
        }
        return { select: jest.fn() };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.update(mockScheduledAreaId, mockPersonAreaId, updatePersonAreaDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove person from scheduled area successfully', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
          // findOne check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPersonAreaData,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'person_areas' && callCount === 3) {
          // Delete
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
        return { select: jest.fn(), delete: jest.fn() };
      });

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.remove(mockScheduledAreaId, mockPersonAreaId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if person area not found', async () => {
      const mockClient = createMockSupabaseClient();
      let callCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'scheduled_areas' && callCount === 1) {
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
        } else if (table === 'person_areas' && callCount === 2) {
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

      mockSupabaseService.getRawClient.mockReturnValue(mockClient);

      await expect(
        service.remove(mockScheduledAreaId, mockPersonAreaId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

