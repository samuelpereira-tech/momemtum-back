import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../shared/infra/database/supabase/supabase.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { EmailPasswordStrategy } from './strategies/email-password.strategy';
import { OAuthStrategy } from './strategies/oauth.strategy';
import { MagicLinkStrategy } from './strategies/magic-link.strategy';
import { OTPStrategy } from './strategies/otp.strategy';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailPasswordStrategy,
    OAuthStrategy,
    MagicLinkStrategy,
    OTPStrategy,
    AuthGuard,
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthenticationModule {}

