import { Module } from '@nestjs/common';
import { ScheduledAbsenceController } from './controllers/scheduled-absence.controller';
import { AbsenceTypeController } from './controllers/absence-type.controller';
import { ScheduledAbsenceService } from './services/scheduled-absence.service';
import { AbsenceTypeService } from './services/absence-type.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [ScheduledAbsenceController, AbsenceTypeController],
  providers: [ScheduledAbsenceService, AbsenceTypeService],
  exports: [ScheduledAbsenceService, AbsenceTypeService],
})
export class ScheduledAbsenceModule {}

