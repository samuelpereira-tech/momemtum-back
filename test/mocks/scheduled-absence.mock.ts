import { faker } from '@faker-js/faker';
import { ScheduledAbsenceResponseDto, PaginatedScheduledAbsenceResponseDto } from 'src/basic/scheduled-absence/dto/scheduled-absence-response.dto';
import { CreateScheduledAbsenceDto } from 'src/basic/scheduled-absence/dto/create-scheduled-absence.dto';

/**
 * Creates mock scheduled absence data (database format)
 */
export const createMockScheduledAbsenceData = (overrides?: Partial<ReturnType<typeof createMockScheduledAbsenceData>>) => {
  const personId = overrides?.person_id || faker.string.uuid();
  const absenceTypeId = overrides?.absence_type_id || faker.string.uuid();
  const scheduledAbsenceId = overrides?.id || faker.string.uuid();
  
  const startDate = overrides?.start_date || faker.date.future().toISOString().split('T')[0];
  const endDate = overrides?.end_date || faker.date.future({ refDate: startDate }).toISOString().split('T')[0];

  return {
    id: scheduledAbsenceId,
    person_id: personId,
    absence_type_id: absenceTypeId,
    start_date: startDate,
    end_date: endDate,
    description: faker.lorem.sentence(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    person: {
      id: personId,
      full_name: faker.person.fullName(),
      email: faker.internet.email(),
    },
    absence_type: {
      id: absenceTypeId,
      name: faker.lorem.word(),
      color: faker.color.rgb(),
    },
    ...overrides,
  };
};

/**
 * Creates mock scheduled absence response (DTO format)
 */
export const createMockScheduledAbsenceResponse = (overrides?: Partial<ScheduledAbsenceResponseDto>): ScheduledAbsenceResponseDto => {
  const mockData = createMockScheduledAbsenceData(overrides);
  return {
    id: mockData.id,
    personId: mockData.person_id,
    absenceTypeId: mockData.absence_type_id,
    startDate: mockData.start_date,
    endDate: mockData.end_date,
    description: mockData.description,
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    person: {
      id: mockData.person.id,
      fullName: mockData.person.full_name,
      email: mockData.person.email,
    },
    absenceType: {
      id: mockData.absence_type.id,
      name: mockData.absence_type.name,
      color: mockData.absence_type.color,
    },
    ...overrides,
  };
};

/**
 * Creates mock CreateScheduledAbsenceDto
 */
export const createMockCreateScheduledAbsenceDto = (overrides?: Partial<CreateScheduledAbsenceDto>): CreateScheduledAbsenceDto => {
  const startDate = faker.date.future().toISOString().split('T')[0];
  const endDate = faker.date.future({ refDate: startDate }).toISOString().split('T')[0];
  
  return {
    personId: faker.string.uuid(),
    absenceTypeId: faker.string.uuid(),
    startDate,
    endDate,
    description: faker.lorem.sentence(),
    ...overrides,
  };
};

/**
 * Creates mock paginated scheduled absence response
 */
export const createMockPaginatedScheduledAbsenceResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedScheduledAbsenceResponseDto>
): PaginatedScheduledAbsenceResponseDto => {
  const data = Array.from({ length: count }, () => createMockScheduledAbsenceResponse());
  return {
    data,
    meta: {
      page: 1,
      limit: 10,
      total: count,
      totalPages: Math.ceil(count / 10),
    },
    ...overrides,
  };
};

/**
 * Creates mock ScheduledAbsenceService
 */
export const createMockScheduledAbsenceService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
};

