import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { ScheduledAbsenceService } from '../services/scheduled-absence.service';
import { CreateScheduledAbsenceDto } from '../dto/create-scheduled-absence.dto';
import { UpdateScheduledAbsenceDto } from '../dto/update-scheduled-absence.dto';
import {
  ScheduledAbsenceResponseDto,
  PaginatedScheduledAbsenceResponseDto,
} from '../dto/scheduled-absence-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('scheduled-absences')
@Controller('api/scheduled-absences')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduledAbsenceController {
  constructor(
    private readonly scheduledAbsenceService: ScheduledAbsenceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new scheduled absence',
    description: 'Creates a new scheduled absence for a person',
  })
  @ApiResponse({
    status: 201,
    description: 'Scheduled absence created successfully',
    type: ScheduledAbsenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person or absence type not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping absence dates for the same person',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createScheduledAbsenceDto: CreateScheduledAbsenceDto,
  ): Promise<ScheduledAbsenceResponseDto> {
    return this.scheduledAbsenceService.create(createScheduledAbsenceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all scheduled absences',
    description: 'Retrieves a paginated list of scheduled absences with optional filters',
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
    name: 'personId',
    required: false,
    description: 'Filter by person ID (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'personName',
    required: false,
    description: 'Filter by person name (partial match, case-insensitive)',
    type: String,
  })
  @ApiQuery({
    name: 'absenceTypeId',
    required: false,
    description: 'Filter by absence type ID (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (ISO 8601 format YYYY-MM-DD). Returns absences starting from this date',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (ISO 8601 format YYYY-MM-DD). Returns absences ending before or on this date',
    type: String,
  })
  @ApiQuery({
    name: 'dateRange',
    required: false,
    description: 'Filter by date range. Returns absences that overlap with the specified date range. Format: YYYY-MM-DD,YYYY-MM-DD',
    type: String,
    example: '2024-12-01,2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'List of scheduled absences retrieved successfully',
    type: PaginatedScheduledAbsenceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('personId') personId?: string,
    @Query('personName') personName?: string,
    @Query('absenceTypeId') absenceTypeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dateRange') dateRange?: string,
  ): Promise<PaginatedScheduledAbsenceResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    return this.scheduledAbsenceService.findAll(
      pageNum,
      limitNum,
      personId,
      personName,
      absenceTypeId,
      startDate,
      endDate,
      dateRange,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get scheduled absence by ID',
    description: 'Retrieves a specific scheduled absence by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled absence retrieved successfully',
    type: ScheduledAbsenceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled absence not found' })
  async findOne(@Param('id') id: string): Promise<ScheduledAbsenceResponseDto> {
    return this.scheduledAbsenceService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update scheduled absence',
    description: 'Updates an existing scheduled absence',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled absence updated successfully',
    type: ScheduledAbsenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Scheduled absence, person, or absence type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping absence dates for the same person',
  })
  async update(
    @Param('id') id: string,
    @Body() updateScheduledAbsenceDto: UpdateScheduledAbsenceDto,
  ): Promise<ScheduledAbsenceResponseDto> {
    return this.scheduledAbsenceService.update(id, updateScheduledAbsenceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete scheduled absence',
    description: 'Deletes a scheduled absence by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled absence deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Scheduled absence deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled absence not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.scheduledAbsenceService.remove(id);
    return { message: 'Scheduled absence deleted successfully' };
  }
}

