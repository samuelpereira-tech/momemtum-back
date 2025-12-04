import { faker } from '@faker-js/faker';
import { ResponsibilityResponseDto, PaginatedResponsibilityResponseDto, ImageUploadResponseDto } from 'src/basic/responsibilities/dto/responsibility-response.dto';
import { CreateResponsibilityDto } from 'src/basic/responsibilities/dto/create-responsibility.dto';

/**
 * Creates mock responsibility data (database format)
 */
export const createMockResponsibilityData = (overrides?: Partial<ReturnType<typeof createMockResponsibilityData>>) => {
  const scheduledAreaId = overrides?.scheduled_area_id || faker.string.uuid();
  const responsibilityId = overrides?.id || faker.string.uuid();

  return {
    id: responsibilityId,
    name: faker.person.jobTitle(),
    description: faker.lorem.sentence(),
    scheduled_area_id: scheduledAreaId,
    image_url: faker.internet.url(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    scheduled_area: {
      id: scheduledAreaId,
      name: faker.company.name(),
    },
    ...overrides,
  };
};

/**
 * Creates mock responsibility response (DTO format)
 */
export const createMockResponsibilityResponse = (overrides?: Partial<ResponsibilityResponseDto>): ResponsibilityResponseDto => {
  const mockData = createMockResponsibilityData(overrides);
  return {
    id: mockData.id,
    name: mockData.name,
    description: mockData.description,
    scheduledAreaId: mockData.scheduled_area_id,
    scheduledArea: {
      id: mockData.scheduled_area.id,
      name: mockData.scheduled_area.name,
    },
    imageUrl: mockData.image_url,
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    ...overrides,
  };
};

/**
 * Creates mock CreateResponsibilityDto
 */
export const createMockCreateResponsibilityDto = (overrides?: Partial<CreateResponsibilityDto>): CreateResponsibilityDto => {
  return {
    name: faker.person.jobTitle(),
    description: faker.lorem.sentence(),
    scheduledAreaId: faker.string.uuid(),
    ...overrides,
  };
};

/**
 * Creates mock paginated responsibility response
 */
export const createMockPaginatedResponsibilityResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedResponsibilityResponseDto>
): PaginatedResponsibilityResponseDto => {
  const data = Array.from({ length: count }, () => createMockResponsibilityResponse());
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
 * Creates mock image upload response
 */
export const createMockImageUploadResponse = (responsibilityId?: string): ImageUploadResponseDto => {
  return {
    message: 'Image uploaded successfully',
    imageUrl: faker.internet.url(),
    responsibilityId: responsibilityId || faker.string.uuid(),
  };
};

/**
 * Creates mock ResponsibilityService
 */
export const createMockResponsibilityService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };
};

