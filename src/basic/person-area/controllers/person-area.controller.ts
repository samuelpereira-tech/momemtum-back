import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { PersonAreaService } from '../services/person-area.service';
import { CreatePersonAreaDto } from '../dto/create-person-area.dto';
import { UpdatePersonAreaDto } from '../dto/update-person-area.dto';
import {
  PersonAreaResponseDto,
  PaginatedPersonAreaResponseDto,
} from '../dto/person-area-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('person-areas')
@Controller('api/scheduled-areas/:scheduledAreaId/persons')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class PersonAreaController {
  constructor(private readonly personAreaService: PersonAreaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add person to scheduled area',
    description:
      'Associates a person with a scheduled area and assigns one or more responsibilities to them.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Person added to scheduled area successfully',
    type: PersonAreaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data (person not found, responsibility not found, or responsibility does not belong to the area)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled area not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Person is already associated with this scheduled area',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() createPersonAreaDto: CreatePersonAreaDto,
  ): Promise<PersonAreaResponseDto> {
    return this.personAreaService.create(scheduledAreaId, createPersonAreaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List persons in scheduled area',
    description:
      'Retrieves a paginated list of all persons associated with a scheduled area, including their assigned responsibilities.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts at 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'personName',
    required: false,
    description: 'Filter by person name (partial match, case-insensitive)',
    type: String,
  })
  @ApiQuery({
    name: 'personEmail',
    required: false,
    description: 'Filter by person email (partial match, case-insensitive)',
    type: String,
  })
  @ApiQuery({
    name: 'responsibilityId',
    required: false,
    description:
      'Filter by responsibility ID (show only persons with this responsibility)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of persons in scheduled area retrieved successfully',
    type: PaginatedPersonAreaResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Scheduled area not found',
  })
  async findAll(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('personName') personName?: string,
    @Query('personEmail') personEmail?: string,
    @Query('responsibilityId') responsibilityId?: string,
  ): Promise<PaginatedPersonAreaResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10)))
      : 10;
    return this.personAreaService.findAll(
      scheduledAreaId,
      pageNum,
      limitNum,
      personName,
      personEmail,
      responsibilityId,
    );
  }

  @Get('by-person/:personId')
  @ApiOperation({
    summary: 'Get person area by person ID',
    description:
      'Retrieves the person-area association for a specific person in a scheduled area. This is useful when you know the person ID but not the association ID.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'personId',
    description: 'Person unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Person area association retrieved successfully',
    type: PersonAreaResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description:
      'Person not associated with this scheduled area, or scheduled area not found',
  })
  async findByPersonId(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('personId') personId: string,
  ): Promise<PersonAreaResponseDto> {
    return this.personAreaService.findByPersonId(scheduledAreaId, personId);
  }

  @Get(':personAreaId')
  @ApiOperation({
    summary: 'Get person area association by ID',
    description: 'Retrieves a specific person-area association by its ID.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'personAreaId',
    description: 'Person area association unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Person area association retrieved successfully',
    type: PersonAreaResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Person area association or scheduled area not found',
  })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('personAreaId') personAreaId: string,
  ): Promise<PersonAreaResponseDto> {
    return this.personAreaService.findOne(scheduledAreaId, personAreaId);
  }

  @Patch(':personAreaId')
  @ApiOperation({
    summary: 'Update person responsibilities in area',
    description:
      'Updates the responsibilities assigned to a person in a scheduled area. Only the responsibilities list will be updated.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'personAreaId',
    description: 'Person area association unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Person responsibilities updated successfully',
    type: PersonAreaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data (responsibility not found or does not belong to the area)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Person area association or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('personAreaId') personAreaId: string,
    @Body() updatePersonAreaDto: UpdatePersonAreaDto,
  ): Promise<PersonAreaResponseDto> {
    return this.personAreaService.update(
      scheduledAreaId,
      personAreaId,
      updatePersonAreaDto,
    );
  }

  @Delete(':personAreaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove person from scheduled area',
    description:
      'Removes a person from a scheduled area, including all their assigned responsibilities.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'personAreaId',
    description: 'Person area association unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Person removed from scheduled area successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Person area association or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('personAreaId') personAreaId: string,
  ): Promise<void> {
    return this.personAreaService.remove(scheduledAreaId, personAreaId);
  }
}

















