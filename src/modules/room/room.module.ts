import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from 'src/database/entities/match.entity';
import { RoomPlayer } from 'src/database/entities/room-player.entity';
import { Room } from 'src/database/entities/room.entity';
import { GuestModule } from '../guest/guest.module';
import { LanguageModule } from '../language/language.module';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomPlayer, Match]),
    GuestModule,
    LanguageModule,
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
