import { Module } from '@nestjs/common';
import { ScheduledAreaController } from './controllers/scheduled-area.controller';
import { ScheduledAreaService } from './services/scheduled-area.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [ScheduledAreaController],
  providers: [ScheduledAreaService],
  exports: [ScheduledAreaService],
})
export class ScheduleAreaModule {}

