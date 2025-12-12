import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';
import { ScheduleGenerationController } from './controllers/schedule-generation.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { ScheduleMemberController } from './controllers/schedule-member.controller';
import { ScheduleCommentController } from './controllers/schedule-comment.controller';
import { ScheduleLogController } from './controllers/schedule-log.controller';
import { ScheduleGenerationService } from './services/schedule-generation.service';
import { ScheduleService } from './services/schedule.service';
import { ScheduleMemberService } from './services/schedule-member.service';
import { ScheduleCommentService } from './services/schedule-comment.service';
import { ScheduleLogService } from './services/schedule-log.service';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [
    ScheduleGenerationController,
    ScheduleController,
    ScheduleMemberController,
    ScheduleCommentController,
    ScheduleLogController,
  ],
  providers: [
    ScheduleGenerationService,
    ScheduleService,
    ScheduleMemberService,
    ScheduleCommentService,
    ScheduleLogService,
  ],
  exports: [
    ScheduleGenerationService,
    ScheduleService,
    ScheduleMemberService,
    ScheduleCommentService,
    ScheduleLogService,
  ],
})
export class AutomaticScheduleModule {}



