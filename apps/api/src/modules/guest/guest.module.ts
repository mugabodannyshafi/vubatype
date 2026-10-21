import { Module, forwardRef } from '@nestjs/common';
import { GuestAuthGuard } from '../../common/guards/guest-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { GuestController } from './controllers/guest.controller';
import { GuestService } from './services/guest.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [GuestController],
  providers: [GuestService, GuestAuthGuard],
  exports: [GuestService, GuestAuthGuard],
})
export class GuestModule {}
