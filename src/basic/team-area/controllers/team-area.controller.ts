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
import { TeamAreaService } from '../services/team-area.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import {
  TeamResponseDto,
  PaginatedTeamResponseDto,
} from '../dto/team-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';

@ApiTags('teams')
@Controller('api/scheduled-areas/:scheduledAreaId/teams')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamAreaController {
  constructor(private readonly teamAreaService: TeamAreaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new team',
    description:
      'Creates a new team within a scheduled area. Teams can have multiple roles (funções) with quantities, priorities, and fixed person assignments.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: TeamResponseDto,
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
      'Conflict - Team with this name already exists in the scheduled area',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Body() createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamAreaService.create(scheduledAreaId, createTeamDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List teams in scheduled area',
    description:
      'Retrieves a paginated list of all teams within a scheduled area, including their roles.',
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
    description: 'Filter by team name (partial match, case-insensitive)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of teams retrieved successfully',
    type: PaginatedTeamResponseDto,
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
  ): Promise<PaginatedTeamResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10)))
      : 10;
    return this.teamAreaService.findAll(scheduledAreaId, pageNum, limitNum, name);
  }

  @Get(':teamId')
  @ApiOperation({
    summary: 'Get team by ID',
    description:
      'Retrieves a specific team by its ID, including all roles and fixed person assignments.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or scheduled area not found',
  })
  async findOne(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('teamId') teamId: string,
  ): Promise<TeamResponseDto> {
    return this.teamAreaService.findOne(scheduledAreaId, teamId);
  }

  @Patch(':teamId')
  @ApiOperation({
    summary: 'Update team',
    description:
      "Updates a team's name, description, and/or roles. Only provided fields will be updated. When updating roles, the entire roles array is replaced.",
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input data (e.g., duplicate priority, invalid quantity, fixed persons exceed quantity)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or scheduled area not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Team with this name already exists in the scheduled area, or duplicate priority in roles',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('teamId') teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamAreaService.update(scheduledAreaId, teamId, updateTeamDto);
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete team',
    description:
      'Removes a team and all its roles. This operation cannot be undone.',
  })
  @ApiParam({
    name: 'scheduledAreaId',
    description: 'Scheduled area unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Team deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Team or scheduled area not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(
    @Param('scheduledAreaId') scheduledAreaId: string,
    @Param('teamId') teamId: string,
  ): Promise<void> {
    return this.teamAreaService.remove(scheduledAreaId, teamId);
  }
}

