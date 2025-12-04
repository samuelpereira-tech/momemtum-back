import { faker } from '@faker-js/faker';
import { AbsenceTypeResponseDto, PaginatedAbsenceTypeResponseDto } from 'src/basic/scheduled-absence/dto/absence-type-response.dto';
import { CreateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/create-absence-type.dto';

/**
 * Creates mock absence type data (database format)
 */
export const createMockAbsenceTypeData = (overrides?: Partial<ReturnType<typeof createMockAbsenceTypeData>>) => {
  const absenceTypeId = overrides?.id || faker.string.uuid();

  return {
    id: absenceTypeId,
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    color: faker.color.rgb(),
    active: faker.datatype.boolean(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
};

/**
 * Creates mock absence type response (DTO format)
 */
export const createMockAbsenceTypeResponse = (overrides?: Partial<AbsenceTypeResponseDto>): AbsenceTypeResponseDto => {
  const mockData = createMockAbsenceTypeData(overrides);
  return {
    id: mockData.id,
    name: mockData.name,
    description: mockData.description,
    color: mockData.color,
    active: mockData.active,
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    ...overrides,
  };
};

/**
 * Creates mock CreateAbsenceTypeDto
 */
export const createMockCreateAbsenceTypeDto = (overrides?: Partial<CreateAbsenceTypeDto>): CreateAbsenceTypeDto => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    color: faker.color.rgb(),
    active: faker.datatype.boolean(),
    ...overrides,
  };
};

/**
 * Creates mock paginated absence type response
 */
export const createMockPaginatedAbsenceTypeResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedAbsenceTypeResponseDto>
): PaginatedAbsenceTypeResponseDto => {
  const data = Array.from({ length: count }, () => createMockAbsenceTypeResponse());
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
 * Creates mock AbsenceTypeService
 */
export const createMockAbsenceTypeService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
  };
};

