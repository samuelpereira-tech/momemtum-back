import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import { ScheduleCommentService } from '../services/schedule-comment.service';
import {
  CreateScheduleCommentDto,
  UpdateScheduleCommentDto,
  ScheduleCommentResponseDto,
} from '../dto/schedule-comment.dto';

@ApiTags('schedule-comments')
@Controller('api/scheduled-areas/:scheduledAreaId/schedules/:scheduleId/comments')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleCommentController {
  constructor(
    private readonly scheduleCommentService: ScheduleCommentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add comment to schedule',
    description: 'Adds a comment to a schedule.',
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
    status: 201,
    description: 'Comment added successfully',
    type: ScheduleCommentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Schedule or scheduled area not found' })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() createDto: CreateScheduleCommentDto,
    @Req() request: Request,
  ): Promise<ScheduleCommentResponseDto> {
    const userId = (request as any).user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.scheduleCommentService.create(
      scheduledAreaId,
      scheduleId,
      createDto,
      userId,
    );
  }

  @Patch(':commentId')
  @ApiOperation({
    summary: 'Update schedule comment',
    description:
      'Updates a comment on a schedule. Only the comment author can update their comment.',
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
  @ApiParam({
    name: 'commentId',
    description: 'Comment unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: ScheduleCommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or unauthorized to update',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Comment, schedule, or scheduled area not found',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateScheduleCommentDto,
    @Req() request: Request,
  ): Promise<ScheduleCommentResponseDto> {
    const userId = (request as any).user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.scheduleCommentService.update(
      scheduledAreaId,
      scheduleId,
      commentId,
      updateDto,
      userId,
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete schedule comment',
    description:
      'Deletes a comment from a schedule. Only the comment author or administrators can delete comments.',
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
  @ApiParam({
    name: 'commentId',
    description: 'Comment unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not authorized to delete this comment',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment, schedule, or scheduled area not found',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('commentId') commentId: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request as any).user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.scheduleCommentService.remove(
      scheduledAreaId,
      scheduleId,
      commentId,
      userId,
    );
  }
}



