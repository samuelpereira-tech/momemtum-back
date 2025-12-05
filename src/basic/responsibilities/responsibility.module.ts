import { Module } from '@nestjs/common';
import { ResponsibilityController } from './controllers/responsibility.controller';
import { ResponsibilityService } from './services/responsibility.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [ResponsibilityController],
  providers: [ResponsibilityService],
  exports: [ResponsibilityService],
})
export class ResponsibilityModule {}




