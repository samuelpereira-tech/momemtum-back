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
import { ResponsibilityService } from '../services/responsibility.service';
import { CreateResponsibilityDto } from '../dto/create-responsibility.dto';
import { UpdateResponsibilityDto } from '../dto/update-responsibility.dto';
import {
  ResponsibilityResponseDto,
  PaginatedResponsibilityResponseDto,
  ImageUploadResponseDto,
} from '../dto/responsibility-response.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import type { MulterFile } from '../interfaces/file.interface';

@ApiTags('responsibilities')
@Controller('api/responsibilities')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ResponsibilityController {
  constructor(
    private readonly responsibilityService: ResponsibilityService,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new responsibility',
    description:
      'Creates a new responsibility with the provided information. Must be linked to a scheduled area.',
  })
  @ApiResponse({
    status: 201,
    description: 'Responsibility created successfully',
    type: ResponsibilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Scheduled area not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createResponsibilityDto: CreateResponsibilityDto,
  ): Promise<ResponsibilityResponseDto> {
    return this.responsibilityService.create(createResponsibilityDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all responsibilities',
    description:
      'Retrieves a list of all responsibilities with pagination support. Can be filtered by scheduled area ID.',
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
    name: 'scheduledAreaId',
    required: false,
    description: 'Filter by scheduled area ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of responsibilities retrieved successfully',
    type: PaginatedResponsibilityResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('scheduledAreaId') scheduledAreaId?: string,
  ): Promise<PaginatedResponsibilityResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    return this.responsibilityService.findAll(pageNum, limitNum, scheduledAreaId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get responsibility by ID',
    description: 'Retrieves a specific responsibility by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Responsibility retrieved successfully',
    type: ResponsibilityResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Responsibility not found' })
  async findOne(@Param('id') id: string): Promise<ResponsibilityResponseDto> {
    return this.responsibilityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update responsibility',
    description:
      'Updates a responsibility with the provided information. Only provided fields will be updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Responsibility updated successfully',
    type: ResponsibilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({
    status: 404,
    description: 'Responsibility not found or scheduled area not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateResponsibilityDto: UpdateResponsibilityDto,
  ): Promise<ResponsibilityResponseDto> {
    return this.responsibilityService.update(id, updateResponsibilityDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete responsibility',
    description: 'Deletes a responsibility by its ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Responsibility deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Responsibility not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.responsibilityService.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload responsibility image',
    description:
      'Uploads or updates an image for a specific responsibility. Accepts image files (JPG, PNG, GIF) with a maximum size of 5MB.',
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
  @ApiResponse({ status: 404, description: 'Responsibility not found' })
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
    return this.responsibilityService.uploadImage(id, file, token);
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete responsibility image',
    description: 'Removes the image from a specific responsibility',
  })
  @ApiResponse({
    status: 204,
    description: 'Image deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Responsibility not found or image does not exist' })
  async deleteImage(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    // Extrai o token do request (adicionado pelo AuthGuard)
    const token = (request as any).token;
    return this.responsibilityService.deleteImage(id, token);

  }
}

