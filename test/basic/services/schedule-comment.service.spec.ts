import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleCommentService } from 'src/basic/automatic-schedule/services/schedule-comment.service';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import {
  createMockSupabaseClient,
  createMockSupabaseService,
  createMockCreateScheduleCommentDto,
  createMockUpdateScheduleCommentDto,
  createMockScheduleCommentResponseDto,
} from '../../mocks';

describe('ScheduleCommentService', () => {
  let service: ScheduleCommentService;
  let supabaseService: SupabaseService;

  const mockScheduledAreaId = faker.string.uuid();
  const mockScheduleId = faker.string.uuid();
  const mockCommentId = faker.string.uuid();
  const mockUserId = faker.string.uuid();
  const mockOtherUserId = faker.string.uuid();

  const mockSupabaseService = createMockSupabaseService();
  const mockClient = createMockSupabaseClient();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleCommentService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScheduleCommentService>(ScheduleCommentService);
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
    const createDto = createMockCreateScheduleCommentDto();

    it('should create schedule comment successfully', async () => {
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

      // Mock insert
      const mockCommentData = {
        id: mockCommentId,
        schedule_id: mockScheduleId,
        content: createDto.content,
        author_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCommentData,
              error: null,
            }),
          }),
        }),
      });

      // Mock author query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockUserId,
                full_name: 'John Doe',
              },
            }),
          }),
        }),
      });

      const result = await service.create(
        mockScheduledAreaId,
        mockScheduleId,
        createDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockCommentId);
      expect(result.authorId).toBe(mockUserId);
    });
  });

  describe('update', () => {
    const updateDto = createMockUpdateScheduleCommentDto();

    it('should update schedule comment successfully', async () => {
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

      // Mock find existing comment
      const mockCommentData = {
        id: mockCommentId,
        schedule_id: mockScheduleId,
        content: 'Old content',
        author_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCommentData,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock update
      mockClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...mockCommentData,
                    content: updateDto.content,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock author query
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockUserId,
                full_name: 'John Doe',
              },
            }),
          }),
        }),
      });

      const result = await service.update(
        mockScheduledAreaId,
        mockScheduleId,
        mockCommentId,
        updateDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
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

      // Mock find existing comment with different author
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockCommentId,
                  author_id: mockOtherUserId, // Different author
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.update(
          mockScheduledAreaId,
          mockScheduleId,
          mockCommentId,
          updateDto,
          mockUserId, // Different user trying to update
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove schedule comment successfully', async () => {
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

      // Mock find existing comment
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockCommentId,
                  author_id: mockUserId,
                },
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

      await service.remove(mockScheduledAreaId, mockScheduleId, mockCommentId, mockUserId);

      expect(mockClient.from).toHaveBeenCalledWith('schedule_comments');
    });

    it('should throw ForbiddenException if user is not the author', async () => {
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

      // Mock find existing comment with different author
      mockClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockCommentId,
                  author_id: mockOtherUserId, // Different author
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.remove(mockScheduledAreaId, mockScheduleId, mockCommentId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});






