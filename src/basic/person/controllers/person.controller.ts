import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiParam,
} from '@nestjs/swagger';
import { PersonService } from '../services/person.service';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import {
  PersonResponseDto,
  PhotoUploadResponseDto,
  PaginatedPersonResponseDto,
} from '../dto/person-response.dto';
import { PersonAvailabilityResponseDto } from '../dto/person-availability-response.dto';
import { PersonAvailabilityQueryDto } from '../dto/person-availability-query.dto';
import { AuthGuard } from '../../../authentication/core/guards/auth.guard';
import type { MulterFile } from '../interfaces/file.interface';

@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class PersonController {
  constructor(private readonly personService: PersonService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new person',
    description: 'Creates a new person with the provided information. The photo can be uploaded separately using the photo upload endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'Person created successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 409, description: 'Conflict - Person with this email or CPF already exists' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(@Body() createPersonDto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.personService.create(createPersonDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all persons',
    description: 'Retrieves a list of all persons with pagination support',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of persons retrieved successfully',
    type: PaginatedPersonResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedPersonResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;
    return this.personService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get person by ID',
    description: 'Retrieves a specific person by their ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Person retrieved successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async findOne(@Param('id') id: string): Promise<PersonResponseDto> {
    return this.personService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update person',
    description: "Updates an existing person's information",
  })
  @ApiResponse({
    status: 200,
    description: 'Person updated successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.personService.update(id, updatePersonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete person',
    description: 'Deletes a person by their ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Person deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.personService.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({
    summary: 'Upload person photo',
    description: 'Uploads or updates a photo for a specific person. Accepts image files (JPG, PNG, GIF) with a maximum size of 5MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, GIF). Maximum size: 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photo uploaded successfully',
    type: PhotoUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size exceeds 5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  @ApiResponse({ status: 413, description: 'Payload too large - File size exceeds 5MB' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /image\/(jpg|jpeg|png|gif)/i }),
        ],
      }),
    )
    file: MulterFile,
    @Req() request: Request,
  ): Promise<PhotoUploadResponseDto> {
    // Extrai o token do request (adicionado pelo AuthGuard)
    const token = (request as any).token;
    return this.personService.uploadPhoto(id, file, token);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete person photo',
    description: 'Removes the photo from a specific person',
  })
  @ApiResponse({
    status: 204,
    description: 'Photo deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found or photo does not exist' })
  async deletePhoto(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    // Extrai o token do request (adicionado pelo AuthGuard)
    const token = (request as any).token;
    return this.personService.deletePhoto(id, token);
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Get person availability',
    description: 'Retrieves dates within a period where the person is scheduled or absent',
  })
  @ApiParam({
    name: 'id',
    description: 'Person unique identifier',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date of the period (format: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date of the period (format: YYYY-MM-DD)',
    type: String,
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Person availability retrieved successfully',
    type: PersonAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getAvailability(
    @Param('id') id: string,
    @Query() query: PersonAvailabilityQueryDto,
  ): Promise<PersonAvailabilityResponseDto> {
    return this.personService.getAvailability(id, query.startDate, query.endDate);
  }
}

