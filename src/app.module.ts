import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from './authentication/core/authentication.module';
import { PersonModule } from './basic/person/person.module';
import { ScheduledAbsenceModule } from './basic/scheduled-absence/scheduled-absence.module';
import { ScheduleAreaModule } from './basic/schedule-area/schedule-area.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthenticationModule,
    PersonModule,
    ScheduledAbsenceModule,
    ScheduleAreaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
