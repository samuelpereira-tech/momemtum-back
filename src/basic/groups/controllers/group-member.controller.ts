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
import { GroupMemberService } from '../services/group-member.service';
import { CreateGroupMemberDto } from '../dto/create-group-member.dto';
import { UpdateGroupMemberDto } from '../dto/update-group-member.dto';
import {
  GroupMemberResponseDto,
  PaginatedGroupMemberResponseDto,
} from '../dto/group-member-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('group-members')
@Controller('api/scheduled-areas/:scheduledAreaId/groups/:groupId/members')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class GroupMemberController {
  constructor(
    private readonly groupMemberService: GroupMemberService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add member to group',
    description:
      'Adds a person to a group within a scheduled area. The person must already be associated with the scheduled area (via Person Area API).',
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
    status: 201,
    description: 'Member added to group successfully',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data (person not found, person not in scheduled area, responsibility not found, or responsibility does not belong to the area)',
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
    description: 'Conflict - Person is already a member of this group',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Body() createGroupMemberDto: CreateGroupMemberDto,
  ): Promise<GroupMemberResponseDto> {
    return this.groupMemberService.create(
      scheduledAreaId,
      groupId,
      createGroupMemberDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List members in group',
    description:
      'Retrieves a paginated list of all members in a group, including their responsibilities.',
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
      'Filter by responsibility ID (show only members with this responsibility)',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of group members retrieved successfully',
    type: PaginatedGroupMemberResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or scheduled area not found',
  })
  async findAll(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('personName') personName?: string,
    @Query('personEmail') personEmail?: string,
    @Query('responsibilityId') responsibilityId?: string,
  ): Promise<PaginatedGroupMemberResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10)))
      : 10;
    return this.groupMemberService.findAll(
      scheduledAreaId,
      groupId,
      pageNum,
      limitNum,
      personName,
      personEmail,
      responsibilityId,
    );
  }

  @Get('by-person/:personId')
  @ApiOperation({
    summary: 'Get group member by person ID',
    description:
      'Retrieves the group member association for a specific person in a group. This is useful when you know the person ID but not the member ID.',
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
  @ApiParam({
    name: 'personId',
    description: 'Person unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group member retrieved successfully',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description:
      'Person not a member of this group, or group/scheduled area not found',
  })
  async findByPersonId(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Param('personId') personId: string,
  ): Promise<GroupMemberResponseDto> {
    return this.groupMemberService.findByPersonId(
      scheduledAreaId,
      groupId,
      personId,
    );
  }

  @Get(':memberId')
  @ApiOperation({
    summary: 'Get group member by ID',
    description: 'Retrieves a specific group member by their member ID.',
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
  @ApiParam({
    name: 'memberId',
    description: 'Group member unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group member retrieved successfully',
    type: GroupMemberResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group member, group, or scheduled area not found',
  })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ): Promise<GroupMemberResponseDto> {
    return this.groupMemberService.findOne(
      scheduledAreaId,
      groupId,
      memberId,
    );
  }

  @Patch(':memberId')
  @ApiOperation({
    summary: 'Update group member responsibilities',
    description:
      'Updates the responsibilities assigned to a member within a group. The entire responsibilities list is replaced with the provided list.',
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
  @ApiParam({
    name: 'memberId',
    description: 'Group member unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group member responsibilities updated successfully',
    type: GroupMemberResponseDto,
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
    description: 'Group member, group, or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() updateGroupMemberDto: UpdateGroupMemberDto,
  ): Promise<GroupMemberResponseDto> {
    return this.groupMemberService.update(
      scheduledAreaId,
      groupId,
      memberId,
      updateGroupMemberDto,
    );
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove member from group',
    description:
      'Removes a person from a group, including all their responsibility assignments within that group.',
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
  @ApiParam({
    name: 'memberId',
    description: 'Group member unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Member removed from group successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Group member, group, or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.groupMemberService.remove(
      scheduledAreaId,
      groupId,
      memberId,
    );
  }
}




