import { Module } from '@nestjs/common';
import { GuestAuthGuard } from '../../common/guards/guest-auth.guard';
import { GuestController } from './controllers/guest.controller';
import { GuestService } from './services/guest.service';

@Module({
  controllers: [GuestController],
  providers: [GuestService, GuestAuthGuard],
  exports: [GuestService, GuestAuthGuard],
})
export class GuestModule {}
