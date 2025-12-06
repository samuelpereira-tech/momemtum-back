import { Module } from '@nestjs/common';
import { TeamAreaController } from './controllers/team-area.controller';
import { TeamAreaService } from './services/team-area.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [TeamAreaController],
  providers: [TeamAreaService],
  exports: [TeamAreaService],
})
export class TeamAreaModule {}


