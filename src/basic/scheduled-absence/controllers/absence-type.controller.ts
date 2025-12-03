import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AbsenceTypeService } from '../services/absence-type.service';
import { CreateAbsenceTypeDto } from '../dto/create-absence-type.dto';
import { UpdateAbsenceTypeDto } from '../dto/update-absence-type.dto';
import {
  AbsenceTypeResponseDto,
  PaginatedAbsenceTypeResponseDto,
} from '../dto/absence-type-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('absence-types')
@Controller('api/absence-types')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class AbsenceTypeController {
  constructor(private readonly absenceTypeService: AbsenceTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new absence type',
    description: 'Creates a new absence type (e.g., Férias, Feriado, Licença)',
  })
  @ApiResponse({
    status: 201,
    description: 'Absence type created successfully',
    type: AbsenceTypeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Absence type with this name already exists',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createAbsenceTypeDto: CreateAbsenceTypeDto,
  ): Promise<AbsenceTypeResponseDto> {
    return this.absenceTypeService.create(createAbsenceTypeDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all absence types',
    description: 'Retrieves a paginated list of absence types with optional filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by name (partial match, case-insensitive)',
    type: String,
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filter by active status',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'List of absence types retrieved successfully',
    type: PaginatedAbsenceTypeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('active') active?: string,
  ): Promise<PaginatedAbsenceTypeResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    const activeBool = active === undefined ? undefined : active === 'true';
    return this.absenceTypeService.findAll(pageNum, limitNum, name, activeBool);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get absence type by ID',
    description: 'Retrieves a specific absence type by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Absence type retrieved successfully',
    type: AbsenceTypeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Absence type not found' })
  async findOne(@Param('id') id: string): Promise<AbsenceTypeResponseDto> {
    return this.absenceTypeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update absence type',
    description: 'Updates an existing absence type',
  })
  @ApiResponse({
    status: 200,
    description: 'Absence type updated successfully',
    type: AbsenceTypeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Absence type not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Absence type with this name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAbsenceTypeDto: UpdateAbsenceTypeDto,
  ): Promise<AbsenceTypeResponseDto> {
    return this.absenceTypeService.update(id, updateAbsenceTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete absence type',
    description: 'Deletes an absence type by its ID. Cannot delete if there are scheduled absences using this type.',
  })
  @ApiResponse({
    status: 200,
    description: 'Absence type deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Absence type deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Absence type not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cannot delete absence type that is being used by scheduled absences',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.absenceTypeService.remove(id);
    return { message: 'Absence type deleted successfully' };
  }

  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Toggle absence type active status',
    description: 'Toggles the active status of an absence type',
  })
  @ApiResponse({
    status: 200,
    description: 'Absence type status toggled successfully',
    type: AbsenceTypeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Absence type not found' })
  async toggle(@Param('id') id: string): Promise<AbsenceTypeResponseDto> {
    return this.absenceTypeService.toggle(id);
  }
}

