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
import { GroupService } from '../services/group.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import {
  GroupResponseDto,
  PaginatedGroupResponseDto,
} from '../dto/group-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('groups')
@Controller('api/scheduled-areas/:scheduledAreaId/groups')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new group',
    description: 'Creates a new group within a scheduled area.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
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
    description:
      'Conflict - Group with this name already exists in the scheduled area',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() createGroupDto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupService.create(scheduledAreaId, createGroupDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List groups in scheduled area',
    description:
      'Retrieves a paginated list of all groups within a scheduled area, including their members and member responsibilities.',
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
    name: 'name',
    required: false,
    description: 'Filter by group name (partial match, case-insensitive)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of groups retrieved successfully',
    type: PaginatedGroupResponseDto,
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
    @Query('name') name?: string,
  ): Promise<PaginatedGroupResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10)))
      : 10;
    return this.groupService.findAll(scheduledAreaId, pageNum, limitNum, name);
  }

  @Get(':groupId')
  @ApiOperation({
    summary: 'Get group by ID',
    description:
      'Retrieves a specific group by its ID, including all members and their responsibilities.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Group unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or scheduled area not found',
  })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
  ): Promise<GroupResponseDto> {
    return this.groupService.findOne(scheduledAreaId, groupId);
  }

  @Patch(':groupId')
  @ApiOperation({
    summary: 'Update group',
    description:
      "Updates a group's name and description. Only provided fields will be updated.",
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Group unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or scheduled area not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Group with this name already exists in the scheduled area',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    return this.groupService.update(scheduledAreaId, groupId, updateGroupDto);
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete group',
    description:
      'Removes a group and all its member associations. This operation cannot be undone.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Group unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Group deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
  ): Promise<void> {
    return this.groupService.remove(scheduledAreaId, groupId);
  }
}















