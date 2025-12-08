import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleMemberService } from 'src/basic/automatic-schedule/services/schedule-member.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClient,
  createMockSupabaseService,
  createMockCreateScheduleMemberDto,
  createMockUpdateScheduleMemberDto,
  createMockScheduleMemberResponseDto,
} from '../../mocks';

describe('ScheduleMemberService', () => {
  let service: ScheduleMemberService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();
  const mockMemberId = faker.string.uuid();

  const mockSupabaseService = createMockSupabaseService();
  const mockClient = createMockSupabaseClient();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleMemberService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduleMemberService>(ScheduleMemberService);
    supabaseService = module.get<SupabaseService>(SupabaseService);

    (mockSupabaseService.getRawClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = createMockCreateScheduleMemberDto();

    it('should create schedule member successfully', async () => {
      // Mock schedule validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockScheduleId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock person validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: createDto.personId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock responsibility validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: createDto.responsibilityId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock check existing member
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

      // Mock insert
      const mockMemberData = {
        id: mockMemberId,
        schedule_id: mockScheduleId,
        person_id: createDto.personId,
        responsibility_id: createDto.responsibilityId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMemberData,
              error: null,
            }),
          }),
        }),
      });

      // Mock person query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: createDto.personId,
                full_name: 'John Doe',
                email: 'john@example.com',
                photo_url: null,
              },
            }),
          }),
        }),
      });

      // Mock responsibility query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: createDto.responsibilityId,
                name: 'Operator',
                description: null,
                image_url: null,
              },
            }),
          }),
        }),
      });

      const result = await service.create(mockScheduledAreaId, mockScheduleId, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockMemberId);
      expect(result.personId).toBe(createDto.personId);
    });

    it('should throw ConflictException if person is already a member', async () => {
      // Mock schedule validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockScheduleId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock person validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: createDto.personId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock responsibility validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: createDto.responsibilityId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock check existing member - returns existing
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockMemberId },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.create(mockScheduledAreaId, mockScheduleId, createDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleMemberDto();

    it('should update schedule member successfully', async () => {
      // Mock schedule validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockScheduleId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock find existing member
      const mockMemberData = {
        id: mockMemberId,
        schedule_id: mockScheduleId,
        person_id: faker.string.uuid(),
        responsibility_id: faker.string.uuid(),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockMemberData,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock responsibility validation if provided
      if (updateDto.responsibilityId) {
        mockClient.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: updateDto.responsibilityId },
                  error: null,
                }),
              }),
            }),
          }),
        });
      }

      // Mock update
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...mockMemberData,
                    responsibility_id: updateDto.responsibilityId || mockMemberData.responsibility_id,
                    status: updateDto.status || mockMemberData.status,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock person query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockMemberData.person_id,
                full_name: 'John Doe',
                email: 'john@example.com',
                photo_url: null,
              },
            }),
          }),
        }),
      });

      // Mock responsibility query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: updateDto.responsibilityId || mockMemberData.responsibility_id,
                name: 'Operator',
                description: null,
                image_url: null,
              },
            }),
          }),
        }),
      });

      const result = await service.update(
        mockScheduledAreaId,
        mockScheduleId,
        mockMemberId,
        updateDto,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockMemberId);
    });

    it('should throw NotFoundException if member not found', async () => {
      // Mock schedule validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockScheduleId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock find existing member - not found
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

      await expect(
        service.update(mockScheduledAreaId, mockScheduleId, mockMemberId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove schedule member successfully', async () => {
      // Mock schedule validation
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockScheduleId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock find existing member
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockMemberId },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock delete
      mockClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      });

      await service.remove(mockScheduledAreaId, mockScheduleId, mockMemberId);

      expect(mockClient.from).toHaveBeenCalledWith('schedule_members');
    });
  });
});



