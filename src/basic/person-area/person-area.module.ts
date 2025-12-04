import { Module } from '@nestjs/common';
import { PersonAreaController } from './controllers/person-area.controller';
import { PersonAreaService } from './services/person-area.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [PersonAreaController],
  providers: [PersonAreaService],
  exports: [PersonAreaService],
})
export class PersonAreaModule {}

