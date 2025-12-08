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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import { ScheduleService } from '../services/schedule.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleResponseDto,
  ScheduleDetailsResponseDto,
  PaginatedScheduleResponseDto,
} from '../dto/schedule-response.dto';

@ApiTags('schedules')
@Controller('api/scheduled-areas/:scheduledAreaId/schedules')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOperation({
    summary: 'List schedules',
    description:
      'Retrieves a paginated list of schedules for a scheduled area. Supports filtering by schedule generation, date range, person, group, team, and status.',
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
    name: 'scheduleGenerationId',
    required: false,
    description: 'Filter by schedule generation ID',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (inclusive)',
    type: String,
    format: 'date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (inclusive)',
    type: String,
    format: 'date',
  })
  @ApiQuery({
    name: 'personId',
    required: false,
    description: 'Filter by person ID (schedules where this person participates)',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID (schedules with this group)',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    description: 'Filter by team ID (schedules with this team)',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by schedule status',
    enum: ['pending', 'confirmed', 'cancelled'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of schedules retrieved successfully',
    type: PaginatedScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async findAll(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('scheduleGenerationId') scheduleGenerationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('personId') personId?: string,
    @Query('groupId') groupId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedScheduleResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;

    return this.scheduleService.findAll(scheduledAreaId, pageNum, limitNum, {
      scheduleGenerationId,
      startDate,
      endDate,
      personId,
      groupId,
      teamId,
      status,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create manual schedule',
    description: 'Creates a manual schedule (not generated automatically).',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Schedule created successfully',
    type: ScheduleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Scheduled area, groups, teams, or persons not found',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() createDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.scheduleService.create(scheduledAreaId, createDto);
  }

  @Get(':scheduleId')
  @ApiOperation({
    summary: 'Get schedule by ID',
    description:
      'Retrieves a specific schedule with all its details including members, assignments, and comments.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'scheduleId',
    description: 'Schedule unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
    type: ScheduleDetailsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Schedule or scheduled area not found' })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
  ): Promise<ScheduleDetailsResponseDto> {
    return this.scheduleService.findOne(scheduledAreaId, scheduleId);
  }

  @Patch(':scheduleId')
  @ApiOperation({
    summary: 'Update schedule',
    description:
      'Updates a schedule. Only manual schedules can be fully updated. Automatically generated schedules can only have their status and members updated.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'scheduleId',
    description: 'Schedule unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule updated successfully',
    type: ScheduleDetailsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Schedule or scheduled area not found' })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() updateDto: UpdateScheduleDto,
  ): Promise<ScheduleDetailsResponseDto> {
    return this.scheduleService.update(scheduledAreaId, scheduleId, updateDto);
  }

  @Delete(':scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete schedule',
    description:
      'Deletes a schedule. Only manual schedules can be deleted. Automatically generated schedules should be deleted through their schedule generation.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'scheduleId',
    description: 'Schedule unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Schedule deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete automatically generated schedule' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Schedule or scheduled area not found' })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
  ): Promise<void> {
    return this.scheduleService.remove(scheduledAreaId, scheduleId);
  }
}



