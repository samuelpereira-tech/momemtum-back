import { faker } from '@faker-js/faker';
import { ScheduledAreaResponseDto, PaginatedScheduledAreaResponseDto, ImageUploadResponseDto } from 'src/basic/schedule-area/dto/scheduled-area-response.dto';
import { CreateScheduledAreaDto } from 'src/basic/schedule-area/dto/create-scheduled-area.dto';

/**
 * Creates mock scheduled area data (database format)
 */
export const createMockScheduledAreaData = (overrides?: Partial<ReturnType<typeof createMockScheduledAreaData>>) => {
  const personId = overrides?.responsible_person_id || faker.string.uuid();
  const scheduledAreaId = overrides?.id || faker.string.uuid();

  return {
    id: scheduledAreaId,
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    responsible_person_id: personId,
    image_url: faker.internet.url(),
    favorite: faker.datatype.boolean(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    responsible_person: {
      id: personId,
      full_name: faker.person.fullName(),
      email: faker.internet.email(),
      photo_url: faker.internet.url(),
    },
    ...overrides,
  };
};

/**
 * Creates mock scheduled area response (DTO format)
 */
export const createMockScheduledAreaResponse = (overrides?: Partial<ScheduledAreaResponseDto>): ScheduledAreaResponseDto => {
  const mockData = createMockScheduledAreaData(overrides);
  return {
    id: mockData.id,
    name: mockData.name,
    description: mockData.description,
    responsiblePersonId: mockData.responsible_person_id,
    responsiblePerson: {
      id: mockData.responsible_person.id,
      fullName: mockData.responsible_person.full_name,
      email: mockData.responsible_person.email,
      photoUrl: mockData.responsible_person.photo_url,
    },
    imageUrl: mockData.image_url,
    favorite: mockData.favorite,
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    ...overrides,
  };
};

/**
 * Creates mock CreateScheduledAreaDto
 */
export const createMockCreateScheduledAreaDto = (overrides?: Partial<CreateScheduledAreaDto>): CreateScheduledAreaDto => {
  return {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    responsiblePersonId: faker.string.uuid(),
    favorite: faker.datatype.boolean(),
    ...overrides,
  };
};

/**
 * Creates mock paginated scheduled area response
 */
export const createMockPaginatedScheduledAreaResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedScheduledAreaResponseDto>
): PaginatedScheduledAreaResponseDto => {
  const data = Array.from({ length: count }, () => createMockScheduledAreaResponse());
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
 * Creates mock image upload response for scheduled area
 */
export const createMockScheduledAreaImageUploadResponse = (scheduledAreaId?: string): ImageUploadResponseDto => {
  return {
    message: 'Image uploaded successfully',
    imageUrl: faker.internet.url(),
    scheduledAreaId: scheduledAreaId || faker.string.uuid(),
  };
};

/**
 * Creates mock ScheduledAreaService
 */
export const createMockScheduledAreaService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    toggleFavorite: jest.fn(),
  };
};

