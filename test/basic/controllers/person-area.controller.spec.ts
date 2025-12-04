import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PersonAreaController } from 'src/basic/person-area/controllers/person-area.controller';
import { PersonAreaService } from 'src/basic/person-area/services/person-area.service';
import { AuthGuard } from 'src/authentication/core/guards/auth.guard';
import { SupabaseService } from 'src/shared/infra/database/supabase/supabase.service';
import { CreatePersonAreaDto } from 'src/basic/person-area/dto/create-person-area.dto';
import { UpdatePersonAreaDto } from 'src/basic/person-area/dto/update-person-area.dto';
import { faker } from '@faker-js/faker';
import {
  createMockPersonAreaResponse,
  createMockPaginatedPersonAreaResponse,
  createMockPersonAreaService,
  createMockCreatePersonAreaDto,
  createMockConfigService,
  createMockAuthGuard,
} from '../../mocks';

describe('PersonAreaController', () => {
  let controller: PersonAreaController;
  let service: PersonAreaService;

  const mockPersonAreaId = faker.string.uuid();
  const mockPersonId = faker.string.uuid();
  const mockScheduledAreaId = faker.string.uuid();

  const mockPersonAreaResponse = createMockPersonAreaResponse({
    id: mockPersonAreaId,
    personId: mockPersonId,
    scheduledAreaId: mockScheduledAreaId,
  });

  const mockPaginatedResponse = createMockPaginatedPersonAreaResponse(1);

  const mockPersonAreaService = createMockPersonAreaService();
  const mockSupabaseService = {
    getClient: jest.fn(),
    getRawClient: jest.fn(),
  };
  const mockConfigService = createMockConfigService();
  const mockAuthGuard = createMockAuthGuard();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonAreaController],
      providers: [
        {
          provide: PersonAreaService,
          useValue: mockPersonAreaService,
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

    controller = module.get<PersonAreaController>(PersonAreaController);
    service = module.get<PersonAreaService>(PersonAreaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should add person to scheduled area', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
      const createPersonAreaDto: CreatePersonAreaDto = {
        personId: '123e4567-e89b-12d3-a456-426614174000',
        responsibilityIds: [
          '456e7890-e89b-12d3-a456-426614174001',
          '789e0123-e89b-12d3-a456-426614174002',
        ],
      };

      mockPersonAreaService.create.mockResolvedValue(mockPersonAreaResponse);

      const result = await controller.create(scheduledAreaId, createPersonAreaDto);

      expect(mockPersonAreaService.create).toHaveBeenCalledWith(
        scheduledAreaId,
        createPersonAreaDto,
      );
      expect(result).toEqual(mockPersonAreaResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of persons in scheduled area', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(scheduledAreaId, '1', '10');

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should use default values when query params are not provided', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(
        scheduledAreaId,
        undefined,
        undefined,
      );

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle pagination parameters correctly', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          page: 2,
          limit: 20,
        },
      });

      const result = await controller.findAll(scheduledAreaId, '2', '20');

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        2,
        20,
        undefined,
        undefined,
        undefined,
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(20);
    });

    it('should limit max items per page to 100', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        meta: {
          ...mockPaginatedResponse.meta,
          limit: 100,
        },
      });

      const result = await controller.findAll(scheduledAreaId, '1', '200');

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        1,
        100,
        undefined,
        undefined,
        undefined,
      );
      expect(result.meta.limit).toBe(100);
    });

    it('should ensure minimum page is 1', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(scheduledAreaId, '0', '10');

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle filters correctly', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';

      mockPersonAreaService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(
        scheduledAreaId,
        '1',
        '10',
        'João',
        'joao@example.com',
        '456e7890-e89b-12d3-a456-426614174001',
      );

      expect(mockPersonAreaService.findAll).toHaveBeenCalledWith(
        scheduledAreaId,
        1,
        10,
        'João',
        'joao@example.com',
        '456e7890-e89b-12d3-a456-426614174001',
      );
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('findByPersonId', () => {
    it('should return person area by person ID', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
      const personId = '123e4567-e89b-12d3-a456-426614174000';

      mockPersonAreaService.findByPersonId.mockResolvedValue(mockPersonAreaResponse);

      const result = await controller.findByPersonId(scheduledAreaId, personId);

      expect(mockPersonAreaService.findByPersonId).toHaveBeenCalledWith(
        scheduledAreaId,
        personId,
      );
      expect(result).toEqual(mockPersonAreaResponse);
    });
  });

  describe('findOne', () => {
    it('should return person area association by ID', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
      const personAreaId = 'abc12345-e89b-12d3-a456-426614174003';

      mockPersonAreaService.findOne.mockResolvedValue(mockPersonAreaResponse);

      const result = await controller.findOne(scheduledAreaId, personAreaId);

      expect(mockPersonAreaService.findOne).toHaveBeenCalledWith(
        scheduledAreaId,
        personAreaId,
      );
      expect(result).toEqual(mockPersonAreaResponse);
    });
  });

  describe('update', () => {
    it('should update person responsibilities in area', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
      const personAreaId = 'abc12345-e89b-12d3-a456-426614174003';
      const updatePersonAreaDto: UpdatePersonAreaDto = {
        responsibilityIds: [
          '456e7890-e89b-12d3-a456-426614174001',
          '789e0123-e89b-12d3-a456-426614174002',
          '012e3456-e89b-12d3-a456-426614174005',
        ],
      };

      const updatedPersonArea = {
        ...mockPersonAreaResponse,
        responsibilities: [
          {
            id: '456e7890-e89b-12d3-a456-426614174001',
            name: 'Operador',
            description: 'Responsável por operar equipamentos',
            imageUrl: 'https://example.com/images/responsibility-456.jpg',
          },
          {
            id: '789e0123-e89b-12d3-a456-426614174002',
            name: 'Supervisor',
            description: 'Supervisiona operações',
            imageUrl: null,
          },
          {
            id: '012e3456-e89b-12d3-a456-426614174005',
            name: 'Técnico',
            description: 'Suporte técnico',
            imageUrl: null,
          },
        ],
      };

      mockPersonAreaService.update.mockResolvedValue(updatedPersonArea);

      const result = await controller.update(
        scheduledAreaId,
        personAreaId,
        updatePersonAreaDto,
      );

      expect(mockPersonAreaService.update).toHaveBeenCalledWith(
        scheduledAreaId,
        personAreaId,
        updatePersonAreaDto,
      );
      expect(result).toEqual(updatedPersonArea);
      expect(result.responsibilities).toHaveLength(3);
    });
  });

  describe('remove', () => {
    it('should remove person from scheduled area', async () => {
      const scheduledAreaId = 'def67890-e89b-12d3-a456-426614174004';
      const personAreaId = 'abc12345-e89b-12d3-a456-426614174003';

      mockPersonAreaService.remove.mockResolvedValue(undefined);

      await controller.remove(scheduledAreaId, personAreaId);

      expect(mockPersonAreaService.remove).toHaveBeenCalledWith(
        scheduledAreaId,
        personAreaId,
      );
    });
  });
});

