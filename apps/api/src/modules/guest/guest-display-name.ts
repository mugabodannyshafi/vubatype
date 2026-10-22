import { GuestSession } from '../../database/entities/guest-session.entity';

export function guestDisplayName(guest: GuestSession): string {
  const accountName = guest.user?.display_name?.trim();
  return accountName || guest.nickname;
}
