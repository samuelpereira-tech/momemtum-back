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
import { ScheduleMemberService } from '../services/schedule-member.service';
import {
  CreateScheduleMemberDto,
  UpdateScheduleMemberDto,
  ScheduleMemberResponseDto,
} from '../dto/schedule-member.dto';

@ApiTags('schedule-members')
@Controller('api/scheduled-areas/:scheduledAreaId/schedules/:scheduleId/members')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleMemberController {
  constructor(private readonly scheduleMemberService: ScheduleMemberService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add member to schedule',
    description: 'Adds a person to a schedule with a specific responsibility.',
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
    description: 'Member added successfully',
    type: ScheduleMemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or person already in schedule',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Schedule, person, or responsibility not found',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() createDto: CreateScheduleMemberDto,
  ): Promise<ScheduleMemberResponseDto> {
    return this.scheduleMemberService.create(scheduledAreaId, scheduleId, createDto);
  }

  @Patch(':memberId')
  @ApiOperation({
    summary: 'Update schedule member',
    description: "Updates a schedule member's responsibility or status.",
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
    name: 'memberId',
    description: 'Schedule member unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
    type: ScheduleMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Schedule member, schedule, or scheduled area not found',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateScheduleMemberDto,
  ): Promise<ScheduleMemberResponseDto> {
    return this.scheduleMemberService.update(
      scheduledAreaId,
      scheduleId,
      memberId,
      updateDto,
    );
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove member from schedule',
    description: 'Removes a person from a schedule.',
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
    name: 'memberId',
    description: 'Schedule member unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Member removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Schedule member, schedule, or scheduled area not found',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.scheduleMemberService.remove(scheduledAreaId, scheduleId, memberId);
  }
}



