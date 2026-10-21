import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GuestService } from '../../modules/guest/services/guest.service';

export const GUEST_COOKIE_NAME = 'guest_session';

@Injectable()
export class GuestAuthGuard implements CanActivate {
  constructor(private readonly guestService: GuestService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[GUEST_COOKIE_NAME];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Guest session is missing or invalid');
    }

    const guest = await this.guestService.findValidByToken(token);
    if (!guest) {
      throw new UnauthorizedException('Guest session is missing or invalid');
    }

    request.guest = guest;
    return true;
  }
}
