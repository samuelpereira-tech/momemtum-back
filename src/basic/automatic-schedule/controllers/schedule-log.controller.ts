import {
  Controller,
  Get,
  Param,
  Query,
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
import { ScheduleLogService } from '../services/schedule-log.service';
import {
  ScheduleLogResponseDto,
  PaginatedScheduleLogResponseDto,
  ScheduleLogChangeType,
} from '../dto/schedule-log.dto';

@ApiTags('schedule-logs')
@Controller('api/scheduled-areas/:scheduledAreaId/schedules/:scheduleId/logs')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleLogController {
  constructor(private readonly scheduleLogService: ScheduleLogService) {}

  @Get()
  @ApiOperation({
    summary: 'List schedule logs',
    description:
      'Retrieves a paginated list of logs for a schedule. Supports filtering by change type, person, and who made the change.',
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
    name: 'changeType',
    required: false,
    description: 'Filter by change type',
    enum: ScheduleLogChangeType,
  })
  @ApiQuery({
    name: 'personId',
    required: false,
    description: 'Filter by person ID (logs related to this person)',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'changedBy',
    required: false,
    description: 'Filter by who made the change',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of schedule logs retrieved successfully',
    type: PaginatedScheduleLogResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async findAll(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('changeType') changeType?: ScheduleLogChangeType,
    @Query('personId') personId?: string,
    @Query('changedBy') changedBy?: string,
  ): Promise<PaginatedScheduleLogResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;

    return this.scheduleLogService.findAll(scheduledAreaId, scheduleId, pageNum, limitNum, {
      changeType,
      personId,
      changedBy,
    });
  }
}




