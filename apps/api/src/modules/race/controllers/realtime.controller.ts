import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GuestAuthGuard } from 'src/common/guards/guest-auth.guard';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { RealtimeTicketService } from '../services/realtime-ticket.service';

type GuestRequest = ExpressRequest & { guest: GuestSession };

@ApiTags('Realtime')
@ApiCookieAuth('guest_session')
@UseGuards(GuestAuthGuard)
@Controller('v1/realtime')
export class RealtimeController {
  constructor(private readonly tickets: RealtimeTicketService) {}

  @Post('ticket')
  @ApiOperation({ summary: 'Issue a short-lived ticket for the race socket' })
  @ApiResponse({ status: 201, description: 'Ticket issued' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  issue(@Request() req: GuestRequest) {
    return this.tickets.issue(req.guest.id);
  }
}
