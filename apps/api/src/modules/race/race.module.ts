import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { MatchParticipant } from 'src/database/entities/match-participant.entity';
import { MatchResult } from 'src/database/entities/match-result.entity';
import { Match } from 'src/database/entities/match.entity';
import { GuestModule } from '../guest/guest.module';
import { PracticeModule } from '../practice/practice.module';
import { RoomModule } from '../room/room.module';
import { RealtimeController } from './controllers/realtime.controller';
import { RaceGateway } from './gateways/race.gateway';
import { RaceService } from './services/race.service';
import { RealtimeTicketService } from './services/realtime-ticket.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchParticipant, MatchResult, GuestSession]),
    GuestModule,
    PracticeModule,
    RoomModule,
  ],
  controllers: [RealtimeController],
  providers: [RaceService, RealtimeTicketService, RaceGateway],
})
export class RaceModule {}
