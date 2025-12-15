import { Module } from '@nestjs/common';
import { GroupController } from './controllers/group.controller';
import { GroupMemberController } from './controllers/group-member.controller';
import { GroupService } from './services/group.service';
import { GroupMemberService } from './services/group-member.service';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthenticationModule } from '../../authentication/core/authentication.module';

@Module({
  imports: [SupabaseModule, AuthenticationModule],
  controllers: [GroupController, GroupMemberController],
  providers: [GroupService, GroupMemberService],
  exports: [GroupService, GroupMemberService],
})
export class GroupsModule {}














