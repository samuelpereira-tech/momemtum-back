import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PersonController } from 'src/basic/person/controllers/person.controller';
import { PersonService } from 'src/basic/person/services/person.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreatePersonDto } from 'src/basic/person/dto/create-person.dto';
import { UpdatePersonDto } from 'src/basic/person/dto/update-person.dto';
import { faker } from '@faker-js/faker';
import {
  createMockPersonResponse,
  createMockPaginatedPersonResponse,
  createMockPhotoUploadResponse,
  createMockPersonService,
  createMockCreatePersonDto,
  createMockConfigService,
  createMockAuthGuard,
  createMockFile,
} from '../../mocks';

describe('PersonController', () => {
  let controller: PersonController;
  let service: PersonService;

  const mockPersonId = faker.string.uuid();
  const mockPersonResponse = createMockPersonResponse({ id: mockPersonId });
  const mockPaginatedResponse = createMockPaginatedPersonResponse(1);
  const mockPhotoUploadResponse = createMockPhotoUploadResponse(mockPersonId);

  const mockPersonService = createMockPersonService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonController],
      providers: [
        {
          provide: PersonService,
          useValue: mockPersonService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    }).compile();

    controller = module.get<PersonController>(PersonController);
    service = module.get<PersonService>(PersonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a person', async () => {
      const createPersonDto = createMockCreatePersonDto({
        fullName: mockPersonResponse.fullName,
        email: mockPersonResponse.email,
        phone: mockPersonResponse.phone,
        cpf: mockPersonResponse.cpf,
        birthDate: mockPersonResponse.birthDate,
        emergencyContact: mockPersonResponse.emergencyContact,
        address: mockPersonResponse.address,
      });

      mockPersonService.create.mockResolvedValue(mockPersonResponse);

      const result = await controller.create(createPersonDto);

      expect(mockPersonService.create).toHaveBeenCalledWith(createPersonDto);
      expect(result).toEqual(mockPersonResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of persons', async () => {
      mockPersonService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10');

      expect(mockPersonService.findAll).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      mockPersonService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(undefined, undefined);

      expect(mockPersonService.findAll).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle pagination parameters correctly', async () => {
      mockPersonService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        page: 2,
        limit: 20,
      });

      const result = await controller.findAll('2', '20');

      expect(mockPersonService.findAll).toHaveBeenCalledWith(2, 20);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should limit max items per page to 100', async () => {
      mockPersonService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        limit: 100,
      });

      const result = await controller.findAll('1', '200');

      expect(mockPersonService.findAll).toHaveBeenCalledWith(1, 100);
      expect(result.limit).toBe(100);
    });

    it('should ensure minimum page is 1', async () => {
      mockPersonService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('0', '10');

      expect(mockPersonService.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a person by id', async () => {
      const personId = mockPersonId;

      mockPersonService.findOne.mockResolvedValue(mockPersonResponse);

      const result = await controller.findOne(personId);

      expect(mockPersonService.findOne).toHaveBeenCalledWith(personId);
      expect(result).toEqual(mockPersonResponse);
    });
  });

  describe('update', () => {
    it('should update a person', async () => {
      const personId = mockPersonId;
      const updatePersonDto: UpdatePersonDto = {
        fullName: faker.person.fullName(),
      };

      const updatedPerson = {
        ...mockPersonResponse,
        fullName: updatePersonDto.fullName,
      };

      mockPersonService.update.mockResolvedValue(updatedPerson);

      const result = await controller.update(personId, updatePersonDto);

      expect(mockPersonService.update).toHaveBeenCalledWith(
        personId,
        updatePersonDto,
      );
      expect(result).toEqual(updatedPerson);
      expect(result.fullName).toBe(updatePersonDto.fullName);
    });
  });

  describe('remove', () => {
    it('should delete a person', async () => {
      const personId = mockPersonId;

      mockPersonService.remove.mockResolvedValue(undefined);

      await controller.remove(personId);

      expect(mockPersonService.remove).toHaveBeenCalledWith(personId);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const personId = mockPersonId;
      const mockFile = createMockFile({ fieldname: 'photo' });

      mockPersonService.uploadPhoto.mockResolvedValue(mockPhotoUploadResponse);

      const testToken = faker.string.alphanumeric(20);
      const mockRequest = { token: testToken } as any;
      const result = await controller.uploadPhoto(personId, mockFile, mockRequest);

      expect(mockPersonService.uploadPhoto).toHaveBeenCalledWith(
        personId,
        mockFile,
        testToken,
      );
      expect(result).toEqual(mockPhotoUploadResponse);
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      const personId = mockPersonId;

      mockPersonService.deletePhoto.mockResolvedValue(undefined);

      const testToken = faker.string.alphanumeric(20);
      const mockRequest = { token: testToken } as any;
      await controller.deletePhoto(personId, mockRequest);

      expect(mockPersonService.deletePhoto).toHaveBeenCalledWith(personId, testToken);
    });
  });
});

