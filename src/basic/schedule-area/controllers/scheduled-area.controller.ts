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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ScheduledAreaService } from '../services/scheduled-area.service';
import { CreateScheduledAreaDto } from '../dto/create-scheduled-area.dto';
import { UpdateScheduledAreaDto } from '../dto/update-scheduled-area.dto';
import {
  ScheduledAreaResponseDto,
  ImageUploadResponseDto,
  PaginatedScheduledAreaResponseDto,
  ToggleFavoriteDto,
} from '../dto/scheduled-area-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import type { MulterFile } from '../interfaces/file.interface';

@ApiTags('scheduled-areas')
@Controller('api/scheduled-areas')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduledAreaController {
  constructor(
    private readonly scheduledAreaService: ScheduledAreaService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new scheduled area',
    description:
      'Creates a new scheduled area with the provided information. The image can be uploaded separately using the image upload endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scheduled area created successfully',
    type: ScheduledAreaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Responsible person not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createScheduledAreaDto: CreateScheduledAreaDto,
  ): Promise<ScheduledAreaResponseDto> {
    return this.scheduledAreaService.create(createScheduledAreaDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all scheduled areas',
    description:
      'Retrieves a list of all scheduled areas with pagination support. Can be filtered by favorite status.',
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
    name: 'favorite',
    required: false,
    description: 'Filter by favorite status',
    type: Boolean,
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of scheduled areas retrieved successfully',
    type: PaginatedScheduledAreaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('favorite') favorite?: string,
  ): Promise<PaginatedScheduledAreaResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    const favoriteBool = favorite === 'true' ? true : favorite === 'false' ? false : undefined;
    return this.scheduledAreaService.findAll(pageNum, limitNum, favoriteBool);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get scheduled area by ID',
    description: 'Retrieves a specific scheduled area by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled area retrieved successfully',
    type: ScheduledAreaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async findOne(@Param('id') id: string): Promise<ScheduledAreaResponseDto> {
    return this.scheduledAreaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update scheduled area',
    description:
      'Updates a scheduled area with the provided information. Only provided fields will be updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled area updated successfully',
    type: ScheduledAreaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Scheduled area not found or responsible person not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateScheduledAreaDto: UpdateScheduledAreaDto,
  ): Promise<ScheduledAreaResponseDto> {
    return this.scheduledAreaService.update(id, updateScheduledAreaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete scheduled area',
    description: 'Deletes a scheduled area by its ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Scheduled area deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.scheduledAreaService.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload scheduled area image',
    description:
      'Uploads or updates an image for a specific scheduled area. Accepts image files (JPG, PNG, GIF) with a maximum size of 5MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, GIF). Maximum size: 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded successfully',
    type: ImageUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size exceeds 5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  @ApiResponse({ status: 413, description: 'Payload too large - File size exceeds 5MB' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|gif)/i }),
        ],
      }),
    )
    file: MulterFile,
    @Req() request: Request,
  ): Promise<ImageUploadResponseDto> {
    // Extrai o token do request (adicionado pelo AuthGuard)
    const token = (request as any).token;
    return this.scheduledAreaService.uploadImage(id, file, token);
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete scheduled area image',
    description: 'Removes the image from a specific scheduled area',
  })
  @ApiResponse({
    status: 204,
    description: 'Image deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found or image does not exist' })
  async deleteImage(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    // Extrai o token do request (adicionado pelo AuthGuard)
    const token = (request as any).token;
    return this.scheduledAreaService.deleteImage(id, token);
  }

  @Patch(':id/favorite')
  @ApiOperation({
    summary: 'Toggle favorite status',
    description: 'Toggles the favorite status of a scheduled area',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite status updated successfully',
    type: ScheduledAreaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  async toggleFavorite(
    @Param('id') id: string,
    @Body() toggleFavoriteDto: ToggleFavoriteDto,
  ): Promise<ScheduledAreaResponseDto> {
    return this.scheduledAreaService.toggleFavorite(id, toggleFavoriteDto.favorite);
  }
}

