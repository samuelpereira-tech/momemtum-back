import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PersonController } from 'src/basic/controllers/person.controller';
import { PersonService } from 'src/basic/services/person.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreatePersonDto } from 'src/basic/dto/create-person.dto';
import { UpdatePersonDto } from 'src/basic/dto/update-person.dto';
import {
  PersonResponseDto,
  PhotoUploadResponseDto,
  PaginatedPersonResponseDto,
} from 'src/basic/dto/person-response.dto';

describe('PersonController', () => {
  let controller: PersonController;
  let service: PersonService;

  const mockPersonResponse: PersonResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '11987654321',
    cpf: '12345678901',
    birthDate: '1990-01-15',
    emergencyContact: '11987654322',
    address: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
    photoUrl: null,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockPaginatedResponse: PaginatedPersonResponseDto = {
    data: [mockPersonResponse],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  };

  const mockPhotoUploadResponse: PhotoUploadResponseDto = {
    message: 'Photo uploaded successfully',
    photoUrl: 'https://example.com/photos/person-123.jpg',
    personId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockPersonService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SUPABASE_URL') {
        return 'https://test.supabase.co';
      }
      if (key === 'SUPABASE_ANON_KEY') {
        return 'test-anon-key';
      }
      return undefined;
    }),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

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
      const createPersonDto: CreatePersonDto = {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '11987654321',
        cpf: '12345678901',
        birthDate: '1990-01-15',
        emergencyContact: '11987654322',
        address: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, 01234-567',
      };

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
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockPersonService.findOne.mockResolvedValue(mockPersonResponse);

      const result = await controller.findOne(personId);

      expect(mockPersonService.findOne).toHaveBeenCalledWith(personId);
      expect(result).toEqual(mockPersonResponse);
    });
  });

  describe('update', () => {
    it('should update a person', async () => {
      const personId = '123e4567-e89b-12d3-a456-426614174000';
      const updatePersonDto: UpdatePersonDto = {
        fullName: 'Jane Doe',
      };

      const updatedPerson = {
        ...mockPersonResponse,
        fullName: 'Jane Doe',
      };

      mockPersonService.update.mockResolvedValue(updatedPerson);

      const result = await controller.update(personId, updatePersonDto);

      expect(mockPersonService.update).toHaveBeenCalledWith(
        personId,
        updatePersonDto,
      );
      expect(result).toEqual(updatedPerson);
      expect(result.fullName).toBe('Jane Doe');
    });
  });

  describe('remove', () => {
    it('should delete a person', async () => {
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockPersonService.remove.mockResolvedValue(undefined);

      await controller.remove(personId);

      expect(mockPersonService.remove).toHaveBeenCalledWith(personId);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const personId = '123e4567-e89b-12d3-a456-426614174000';
      const mockFile: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('fake-image-data'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockPersonService.uploadPhoto.mockResolvedValue(mockPhotoUploadResponse);

      const mockRequest = { token: 'test-token' } as any;
      const result = await controller.uploadPhoto(personId, mockFile, mockRequest);

      expect(mockPersonService.uploadPhoto).toHaveBeenCalledWith(
        personId,
        mockFile,
        'test-token',
      );
      expect(result).toEqual(mockPhotoUploadResponse);
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockPersonService.deletePhoto.mockResolvedValue(undefined);

      const mockRequest = { token: 'test-token' } as any;
      await controller.deletePhoto(personId, mockRequest);

      expect(mockPersonService.deletePhoto).toHaveBeenCalledWith(personId, 'test-token');
    });
  });
});

