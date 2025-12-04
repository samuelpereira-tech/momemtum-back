import { faker } from '@faker-js/faker';
import { PersonAreaResponseDto, PaginatedPersonAreaResponseDto } from 'src/basic/person-area/dto/person-area-response.dto';
import { CreatePersonAreaDto } from 'src/basic/person-area/dto/create-person-area.dto';

/**
 * Creates mock person area data (database format)
 */
export const createMockPersonAreaData = (overrides?: Partial<ReturnType<typeof createMockPersonAreaData>>) => {
  const personId = overrides?.person_id || faker.string.uuid();
  const scheduledAreaId = overrides?.scheduled_area_id || faker.string.uuid();
  const personAreaId = overrides?.id || faker.string.uuid();
  const responsibilityId = faker.string.uuid();

  return {
    id: personAreaId,
    person_id: personId,
    scheduled_area_id: scheduledAreaId,
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    person: {
      id: personId,
      full_name: faker.person.fullName(),
      email: faker.internet.email(),
      photo_url: faker.internet.url(),
    },
    scheduled_area: {
      id: scheduledAreaId,
      name: faker.company.name(),
    },
    responsibilities: [
      {
        responsibility: {
          id: responsibilityId,
          name: faker.person.jobTitle(),
          description: faker.lorem.sentence(),
          image_url: faker.internet.url(),
        },
      },
    ],
    ...overrides,
  };
};

/**
 * Creates mock person area response (DTO format)
 */
export const createMockPersonAreaResponse = (overrides?: Partial<PersonAreaResponseDto>): PersonAreaResponseDto => {
  const mockData = createMockPersonAreaData(overrides);
  return {
    id: mockData.id,
    personId: mockData.person_id,
    person: {
      id: mockData.person.id,
      fullName: mockData.person.full_name,
      email: mockData.person.email,
      photoUrl: mockData.person.photo_url,
    },
    scheduledAreaId: mockData.scheduled_area_id,
    scheduledArea: {
      id: mockData.scheduled_area.id,
      name: mockData.scheduled_area.name,
    },
    responsibilities: mockData.responsibilities.map((r) => ({
      id: r.responsibility.id,
      name: r.responsibility.name,
      description: r.responsibility.description,
      imageUrl: r.responsibility.image_url,
    })),
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    ...overrides,
  };
};

/**
 * Creates mock CreatePersonAreaDto
 */
export const createMockCreatePersonAreaDto = (overrides?: Partial<CreatePersonAreaDto>): CreatePersonAreaDto => {
  return {
    personId: faker.string.uuid(),
    responsibilityIds: [faker.string.uuid(), faker.string.uuid()],
    ...overrides,
  };
};

/**
 * Creates mock paginated person area response
 */
export const createMockPaginatedPersonAreaResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedPersonAreaResponseDto>
): PaginatedPersonAreaResponseDto => {
  const data = Array.from({ length: count }, () => createMockPersonAreaResponse());
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
 * Creates mock PersonAreaService
 */
export const createMockPersonAreaService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPersonId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
};

