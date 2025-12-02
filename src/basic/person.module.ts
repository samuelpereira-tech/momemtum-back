import { Module } from '@nestjs/common';
import { PersonController } from './controllers/person.controller';
import { PersonService } from './services/person.service';
import { SupabaseModule } from '../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [PersonController],
  providers: [PersonService],
  exports: [PersonService],
})
export class PersonModule {}

