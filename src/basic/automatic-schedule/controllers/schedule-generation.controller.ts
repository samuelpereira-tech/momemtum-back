import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import { ScheduleGenerationService } from '../services/schedule-generation.service';
import { GenerationConfigurationDto } from '../dto/generation-configuration.dto';
import {
  GenerationPreviewDto,
} from '../dto/generation-preview.dto';
import {
  ScheduleGenerationResponseDto,
  PaginatedScheduleGenerationResponseDto,
} from '../dto/schedule-response.dto';

@ApiTags('schedule-generations')
@Controller('api/scheduled-areas/:scheduledAreaId/schedule-generations')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleGenerationController {
  constructor(
    private readonly scheduleGenerationService: ScheduleGenerationService,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate schedule preview',
    description:
      'Generates a preview of schedules that will be created based on the provided configuration. This endpoint does not create schedules, only returns a preview for validation.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview generated successfully',
    type: GenerationPreviewDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration or insufficient data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async preview(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() config: GenerationConfigurationDto,
  ): Promise<GenerationPreviewDto> {
    return this.scheduleGenerationService.preview(scheduledAreaId, config);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Confirm and create schedule generation',
    description:
      'Confirms the generation configuration and creates all schedules. This endpoint creates a schedule generation record and multiple schedule records based on the configuration.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Schedule generation created successfully',
    type: ScheduleGenerationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration or validation errors' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Scheduled area, groups, teams, or persons not found',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() config: GenerationConfigurationDto,
    @Req() request: Request,
  ): Promise<ScheduleGenerationResponseDto> {
    const userId = (request as any).user?.id;
    return this.scheduleGenerationService.create(scheduledAreaId, config, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List schedule generations',
    description:
      'Retrieves a paginated list of all schedule generations for a scheduled area.',
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
  @ApiResponse({
    status: 200,
    description: 'List of schedule generations retrieved successfully',
    type: PaginatedScheduleGenerationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async findAll(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedScheduleGenerationResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    return this.scheduleGenerationService.findAll(scheduledAreaId, pageNum, limitNum);
  }

  @Get(':generationId')
  @ApiOperation({
    summary: 'Get schedule generation by ID',
    description:
      'Retrieves a specific schedule generation with all its associated schedules.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'generationId',
    description: 'Schedule generation unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule generation retrieved successfully',
    type: ScheduleGenerationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Schedule generation or scheduled area not found',
  })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('generationId') generationId: string,
  ): Promise<ScheduleGenerationResponseDto> {
    return this.scheduleGenerationService.findOne(scheduledAreaId, generationId);
  }

  @Delete(':generationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete schedule generation and all its schedules',
    description:
      'Deletes a schedule generation and all schedules associated with it. This action cannot be undone.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'generationId',
    description: 'Schedule generation unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Schedule generation and all schedules deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Schedule generation or scheduled area not found',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('generationId') generationId: string,
  ): Promise<void> {
    return this.scheduleGenerationService.remove(scheduledAreaId, generationId);
  }
}



