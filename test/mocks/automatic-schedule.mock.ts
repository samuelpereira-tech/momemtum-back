import { faker } from '@faker-js/faker';
import {
  GenerationConfigurationDto,
  GenerationType,
  PeriodType,
} from 'src/basic/automatic-schedule/dto/generation-configuration.dto';
import {
  ScheduleGenerationResponseDto,
  ScheduleResponseDto,
  ScheduleDetailsResponseDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from 'src/basic/automatic-schedule/dto/schedule-response.dto';
import {
  CreateScheduleMemberDto,
  UpdateScheduleMemberDto,
  ScheduleMemberResponseDto,
} from 'src/basic/automatic-schedule/dto/schedule-member.dto';
import {
  CreateScheduleCommentDto,
  UpdateScheduleCommentDto,
  ScheduleCommentResponseDto,
} from 'src/basic/automatic-schedule/dto/schedule-comment.dto';
import {
  GenerationPreviewDto,
  SchedulePreviewDto,
} from 'src/basic/automatic-schedule/dto/generation-preview.dto';
import { ScheduleGenerationService } from 'src/basic/automatic-schedule/services/schedule-generation.service';
import { ScheduleService } from 'src/basic/automatic-schedule/services/schedule.service';
import { ScheduleMemberService } from 'src/basic/automatic-schedule/services/schedule-member.service';
import { ScheduleCommentService } from 'src/basic/automatic-schedule/services/schedule-comment.service';

/**
 * Creates a mock GenerationConfigurationDto
 */
export const createMockGenerationConfigurationDto = (
  overrides?: Partial<GenerationConfigurationDto>,
): GenerationConfigurationDto => {
  const scheduledAreaId = overrides?.scheduledAreaId || faker.string.uuid();
  const generationType = overrides?.generationType || GenerationType.GROUP;

  return {
    scheduledAreaId,
    generationType,
    periodType: overrides?.periodType || PeriodType.DAILY,
    periodStartDate: overrides?.periodStartDate || '2025-01-01',
    periodEndDate: overrides?.periodEndDate || '2025-01-31',
    groupConfig:
      generationType === GenerationType.GROUP
        ? {
            groupIds: [faker.string.uuid()],
            groupsPerSchedule: 1,
            distributionOrder: 'balanced' as const,
            considerAbsences: true,
            excludedPersonIds: [],
            ...overrides?.groupConfig,
          }
        : undefined,
    peopleConfig:
      generationType === GenerationType.PEOPLE
        ? {
            considerAbsences: true,
            excludedPersonIds: [],
            ...overrides?.peopleConfig,
          }
        : undefined,
    teamConfig:
      generationType === GenerationType.TEAM_WITHOUT_RESTRICTION ||
      generationType === GenerationType.TEAM_WITH_RESTRICTION
        ? {
            teamId: faker.string.uuid(),
            participantSelection: 'all' as const,
            considerAbsences: true,
            requireResponsibilities: generationType === GenerationType.TEAM_WITH_RESTRICTION,
            ...overrides?.teamConfig,
          }
        : undefined,
    periodConfig: {
      weekdays: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '17:00',
      excludedDates: [],
      includedDates: [],
      ...overrides?.periodConfig,
    },
  };
};

/**
 * Creates a mock ScheduleGenerationResponseDto
 */
export const createMockScheduleGenerationResponseDto = (
  overrides?: Partial<ScheduleGenerationResponseDto>,
): ScheduleGenerationResponseDto => {
  return {
    id: overrides?.id || faker.string.uuid(),
    scheduledAreaId: overrides?.scheduledAreaId || faker.string.uuid(),
    generationType: overrides?.generationType || GenerationType.GROUP,
    periodType: overrides?.periodType || PeriodType.DAILY,
    periodStartDate: overrides?.periodStartDate || '2025-01-01',
    periodEndDate: overrides?.periodEndDate || '2025-01-31',
    configuration: overrides?.configuration || createMockGenerationConfigurationDto(),
    totalSchedulesGenerated: overrides?.totalSchedulesGenerated || 20,
    createdAt: overrides?.createdAt || new Date().toISOString(),
    createdBy: overrides?.createdBy || faker.string.uuid(),
  };
};

/**
 * Creates a mock ScheduleResponseDto
 */
export const createMockScheduleResponseDto = (
  overrides?: Partial<ScheduleResponseDto>,
): ScheduleResponseDto => {
  return {
    id: overrides?.id || faker.string.uuid(),
    scheduleGenerationId: overrides?.scheduleGenerationId || null,
    scheduledAreaId: overrides?.scheduledAreaId || faker.string.uuid(),
    startDatetime: overrides?.startDatetime || '2025-01-01T08:00:00.000Z',
    endDatetime: overrides?.endDatetime || '2025-01-01T17:00:00.000Z',
    scheduleType: overrides?.scheduleType || 'group',
    status: overrides?.status || 'pending',
    participantsCount: overrides?.participantsCount || 5,
    createdAt: overrides?.createdAt || new Date().toISOString(),
    updatedAt: overrides?.updatedAt || new Date().toISOString(),
  };
};

/**
 * Creates a mock ScheduleDetailsResponseDto
 */
export const createMockScheduleDetailsResponseDto = (
  overrides?: Partial<ScheduleDetailsResponseDto>,
): ScheduleDetailsResponseDto => {
  return {
    ...createMockScheduleResponseDto(overrides),
    groups: overrides?.groups || [],
    team: overrides?.team || null,
    assignments: overrides?.assignments || [],
    members: overrides?.members || [],
    comments: overrides?.comments || [],
  };
};

/**
 * Creates a mock CreateScheduleDto
 */
export const createMockCreateScheduleDto = (
  overrides?: Partial<CreateScheduleDto>,
): CreateScheduleDto => {
  return {
    scheduledAreaId: overrides?.scheduledAreaId || faker.string.uuid(),
    startDatetime: overrides?.startDatetime || '2025-01-01T08:00:00.000Z',
    endDatetime: overrides?.endDatetime || '2025-01-01T17:00:00.000Z',
    scheduleType: overrides?.scheduleType || 'group',
    groupIds: overrides?.groupIds || [faker.string.uuid()],
    ...overrides,
  };
};

/**
 * Creates a mock UpdateScheduleDto
 */
export const createMockUpdateScheduleDto = (
  overrides?: Partial<UpdateScheduleDto>,
): UpdateScheduleDto => {
  return {
    status: overrides?.status || 'confirmed',
    ...overrides,
  };
};

/**
 * Creates a mock SchedulePreviewDto
 */
export const createMockSchedulePreviewDto = (
  overrides?: Partial<SchedulePreviewDto>,
): SchedulePreviewDto => {
  return {
    id: overrides?.id || `preview-${faker.string.uuid()}`,
    startDatetime: overrides?.startDatetime || '2025-01-01T08:00:00.000Z',
    endDatetime: overrides?.endDatetime || '2025-01-01T17:00:00.000Z',
    groups: overrides?.groups || [],
    team: overrides?.team || undefined,
    assignments: overrides?.assignments || [],
    warnings: overrides?.warnings || [],
    errors: overrides?.errors || [],
  };
};

/**
 * Creates a mock GenerationPreviewDto
 */
export const createMockGenerationPreviewDto = (
  overrides?: Partial<GenerationPreviewDto>,
): GenerationPreviewDto => {
  return {
    configuration:
      overrides?.configuration || createMockGenerationConfigurationDto(),
    schedules: overrides?.schedules || [createMockSchedulePreviewDto()],
    summary: {
      totalSchedules: overrides?.summary?.totalSchedules || 20,
      totalParticipants: overrides?.summary?.totalParticipants || 15,
      warnings: overrides?.summary?.warnings || 2,
      errors: overrides?.summary?.errors || 0,
      distributionBalance: overrides?.summary?.distributionBalance || 'balanced',
    },
  };
};

/**
 * Creates a mock CreateScheduleMemberDto
 */
export const createMockCreateScheduleMemberDto = (
  overrides?: Partial<CreateScheduleMemberDto>,
): CreateScheduleMemberDto => {
  return {
    personId: overrides?.personId || faker.string.uuid(),
    responsibilityId: overrides?.responsibilityId || faker.string.uuid(),
  };
};

/**
 * Creates a mock UpdateScheduleMemberDto
 */
export const createMockUpdateScheduleMemberDto = (
  overrides?: Partial<UpdateScheduleMemberDto>,
): UpdateScheduleMemberDto => {
  return {
    responsibilityId: overrides?.responsibilityId || faker.string.uuid(),
    status: overrides?.status || 'accepted',
  };
};

/**
 * Creates a mock ScheduleMemberResponseDto
 */
export const createMockScheduleMemberResponseDto = (
  overrides?: Partial<ScheduleMemberResponseDto>,
): ScheduleMemberResponseDto => {
  return {
    id: overrides?.id || faker.string.uuid(),
    personId: overrides?.personId || faker.string.uuid(),
    person: overrides?.person || {
      id: faker.string.uuid(),
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      photoUrl: faker.image.url(),
    },
    responsibilityId: overrides?.responsibilityId || faker.string.uuid(),
    responsibility: overrides?.responsibility || {
      id: faker.string.uuid(),
      name: faker.person.jobTitle(),
      description: faker.lorem.sentence(),
      imageUrl: null,
    },
    status: overrides?.status || 'pending',
    createdAt: overrides?.createdAt || new Date().toISOString(),
  };
};

/**
 * Creates a mock CreateScheduleCommentDto
 */
export const createMockCreateScheduleCommentDto = (
  overrides?: Partial<CreateScheduleCommentDto>,
): CreateScheduleCommentDto => {
  return {
    content: overrides?.content || faker.lorem.sentence(),
  };
};

/**
 * Creates a mock UpdateScheduleCommentDto
 */
export const createMockUpdateScheduleCommentDto = (
  overrides?: Partial<UpdateScheduleCommentDto>,
): UpdateScheduleCommentDto => {
  return {
    content: overrides?.content || faker.lorem.sentence(),
  };
};

/**
 * Creates a mock ScheduleCommentResponseDto
 */
export const createMockScheduleCommentResponseDto = (
  overrides?: Partial<ScheduleCommentResponseDto>,
): ScheduleCommentResponseDto => {
  return {
    id: overrides?.id || faker.string.uuid(),
    content: overrides?.content || faker.lorem.sentence(),
    authorId: overrides?.authorId || faker.string.uuid(),
    authorName: overrides?.authorName || faker.person.fullName(),
    createdAt: overrides?.createdAt || new Date().toISOString(),
    updatedAt: overrides?.updatedAt || new Date().toISOString(),
  };
};

/**
 * Creates a mock ScheduleGenerationService
 */
export const createMockScheduleGenerationService = (): Partial<ScheduleGenerationService> => {
  return {
    preview: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
};

/**
 * Creates a mock ScheduleService
 */
export const createMockScheduleService = (): Partial<ScheduleService> => {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
};

/**
 * Creates a mock ScheduleMemberService
 */
export const createMockScheduleMemberService = (): Partial<ScheduleMemberService> => {
  return {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
};

/**
 * Creates a mock ScheduleCommentService
 */
export const createMockScheduleCommentService = (): Partial<ScheduleCommentService> => {
  return {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
};






