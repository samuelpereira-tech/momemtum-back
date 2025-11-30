import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SupabaseService } from './shared/infra/database/supabase/supabase.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Hello World', description: 'Endpoint básico de teste' })
  @ApiResponse({ status: 200, description: 'Mensagem de boas-vindas' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health-supabase')
  @ApiOperation({
    summary: 'Health Check',
    description: 'Verifica o status da aplicação e conexão com Supabase',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da aplicação',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        supabase: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            message: { type: 'string', example: 'Supabase is connected and responding' },
            connected: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async healthCheck() {
    const supabaseHealth = await this.supabaseService.healthCheck();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      supabase: supabaseHealth,
    };
  }
}
