import { faker } from '@faker-js/faker';
import { PersonResponseDto, PhotoUploadResponseDto, PaginatedPersonResponseDto } from 'src/basic/person/dto/person-response.dto';
import { CreatePersonDto } from 'src/basic/person/dto/create-person.dto';

/**
 * Creates mock person data (database format)
 */
export const createMockPersonData = (overrides?: Partial<ReturnType<typeof createMockPersonData>>) => {
  const id = overrides?.id || faker.string.uuid();
  return {
    id,
    full_name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.string.numeric(11),
    cpf: faker.string.numeric(11),
    birth_date: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
    emergency_contact: faker.string.numeric(11),
    address: `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.location.state({ abbreviated: true })}, ${faker.location.zipCode()}`,
    photo_url: null,
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
};

/**
 * Creates mock person response (DTO format)
 */
export const createMockPersonResponse = (overrides?: Partial<PersonResponseDto>): PersonResponseDto => {
  const mockData = createMockPersonData(overrides);
  return {
    id: mockData.id,
    fullName: mockData.full_name,
    email: mockData.email,
    phone: mockData.phone,
    cpf: mockData.cpf,
    birthDate: mockData.birth_date,
    emergencyContact: mockData.emergency_contact,
    address: mockData.address,
    photoUrl: mockData.photo_url,
    createdAt: mockData.created_at,
    updatedAt: mockData.updated_at,
    ...overrides,
  };
};

/**
 * Creates mock CreatePersonDto
 */
export const createMockCreatePersonDto = (overrides?: Partial<CreatePersonDto>): CreatePersonDto => {
  const mockData = createMockPersonData();
  return {
    fullName: mockData.full_name,
    email: mockData.email,
    phone: mockData.phone,
    cpf: mockData.cpf,
    birthDate: mockData.birth_date,
    emergencyContact: mockData.emergency_contact,
    address: mockData.address,
    ...overrides,
  };
};

/**
 * Creates mock paginated person response
 */
export const createMockPaginatedPersonResponse = (
  count: number = 1,
  overrides?: Partial<PaginatedPersonResponseDto>
): PaginatedPersonResponseDto => {
  const data = Array.from({ length: count }, () => createMockPersonResponse());
  return {
    data,
    page: 1,
    limit: 10,
    total: count,
    totalPages: Math.ceil(count / 10),
    ...overrides,
  };
};

/**
 * Creates mock photo upload response
 */
export const createMockPhotoUploadResponse = (personId?: string): PhotoUploadResponseDto => {
  return {
    message: 'Photo uploaded successfully',
    photoUrl: faker.internet.url(),
    personId: personId || faker.string.uuid(),
  };
};

/**
 * Creates mock PersonService
 */
export const createMockPersonService = () => {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
  };
};

