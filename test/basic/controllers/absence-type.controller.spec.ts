import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AbsenceTypeController } from 'src/basic/scheduled-absence/controllers/absence-type.controller';
import { AbsenceTypeService } from 'src/basic/scheduled-absence/services/absence-type.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from 'src/basic/scheduled-absence/dto/update-absence-type.dto';
import {
  AbsenceTypeResponseDto,
  PaginatedAbsenceTypeResponseDto,
} from 'src/basic/scheduled-absence/dto/absence-type-response.dto';

describe('AbsenceTypeController', () => {
  let controller: AbsenceTypeController;
  let service: AbsenceTypeService;

  const mockAbsenceTypeResponse: AbsenceTypeResponseDto = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'Férias',
    description: 'Período de férias',
    color: '#79D9C7',
    active: true,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockPaginatedResponse: PaginatedAbsenceTypeResponseDto = {
    data: [mockAbsenceTypeResponse],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  };

  const mockAbsenceTypeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
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
      controllers: [AbsenceTypeController],
      providers: [
        {
          provide: AbsenceTypeService,
          useValue: mockAbsenceTypeService,
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

    controller = module.get<AbsenceTypeController>(AbsenceTypeController);
    service = module.get<AbsenceTypeService>(AbsenceTypeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an absence type', async () => {
      const createAbsenceTypeDto: CreateAbsenceTypeDto = {
        name: 'Férias',
        description: 'Período de férias',
        color: '#79D9C7',
        active: true,
      };

      mockAbsenceTypeService.create.mockResolvedValue(mockAbsenceTypeResponse);

      const result = await controller.create(createAbsenceTypeDto);

      expect(mockAbsenceTypeService.create).toHaveBeenCalledWith(
        createAbsenceTypeDto,
      );
      expect(result).toEqual(mockAbsenceTypeResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of absence types', async () => {
      mockAbsenceTypeService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', undefined, undefined);

      expect(mockAbsenceTypeService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      mockAbsenceTypeService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(undefined, undefined, undefined, undefined);

      expect(mockAbsenceTypeService.findAll).toHaveBeenCalledWith(1, 10, undefined, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle filters correctly', async () => {
      mockAbsenceTypeService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', 'Férias', 'true');

      expect(mockAbsenceTypeService.findAll).toHaveBeenCalledWith(1, 10, 'Férias', true);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should limit max items per page to 100', async () => {
      mockAbsenceTypeService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        limit: 100,
      });

      const result = await controller.findAll('1', '200', undefined, undefined);

      expect(mockAbsenceTypeService.findAll).toHaveBeenCalledWith(1, 100, undefined, undefined);
      expect(result.limit).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return an absence type by id', async () => {
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

      mockAbsenceTypeService.findOne.mockResolvedValue(mockAbsenceTypeResponse);

      const result = await controller.findOne(absenceTypeId);

      expect(mockAbsenceTypeService.findOne).toHaveBeenCalledWith(absenceTypeId);
      expect(result).toEqual(mockAbsenceTypeResponse);
    });
  });

  describe('update', () => {
    it('should update an absence type', async () => {
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';
      const updateAbsenceTypeDto: UpdateAbsenceTypeDto = {
        name: 'Férias Atualizado',
      };

      const updatedAbsenceType = {
        ...mockAbsenceTypeResponse,
        name: 'Férias Atualizado',
      };

      mockAbsenceTypeService.update.mockResolvedValue(updatedAbsenceType);

      const result = await controller.update(absenceTypeId, updateAbsenceTypeDto);

      expect(mockAbsenceTypeService.update).toHaveBeenCalledWith(
        absenceTypeId,
        updateAbsenceTypeDto,
      );
      expect(result).toEqual(updatedAbsenceType);
      expect(result.name).toBe('Férias Atualizado');
    });
  });

  describe('remove', () => {
    it('should delete an absence type', async () => {
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';

      mockAbsenceTypeService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(absenceTypeId);

      expect(mockAbsenceTypeService.remove).toHaveBeenCalledWith(absenceTypeId);
      expect(result).toEqual({ message: 'Absence type deleted successfully' });
    });
  });

  describe('toggle', () => {
    it('should toggle active status', async () => {
      const absenceTypeId = '456e7890-e89b-12d3-a456-426614174001';
      const toggledAbsenceType = {
        ...mockAbsenceTypeResponse,
        active: false,
      };

      mockAbsenceTypeService.toggle.mockResolvedValue(toggledAbsenceType);

      const result = await controller.toggle(absenceTypeId);

      expect(mockAbsenceTypeService.toggle).toHaveBeenCalledWith(absenceTypeId);
      expect(result).toEqual(toggledAbsenceType);
      expect(result.active).toBe(false);
    });
  });
});

