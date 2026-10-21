import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GuestAuthGuard } from 'src/common/guards/guest-auth.guard';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomMatchesQueryDto } from '../dto/room-matches-query.dto';
import { RoomService } from '../services/room.service';

type GuestRequest = ExpressRequest & { guest: GuestSession };

@ApiTags('Rooms')
@ApiCookieAuth('guest_session')
@UseGuards(GuestAuthGuard)
@Controller('v1/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a private multiplayer room' })
  @ApiResponse({ status: 201, description: 'Room created' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  @ApiResponse({
    status: 409,
    description: 'Guest is already in this room or a room code could not be allocated',
  })
  create(@Body() dto: CreateRoomDto, @Request() req: GuestRequest) {
    return this.roomService.create(req.guest, dto);
  }

  @Get(':code/matches')
  @ApiOperation({ summary: 'List previous matches played in a room' })
  @ApiResponse({ status: 200, description: 'Room matches retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  listMatches(@Param('code') code: string, @Query() query: RoomMatchesQueryDto) {
    return this.roomService.listMatches(code, query);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get a multiplayer room, its settings, and current players' })
  @ApiResponse({ status: 200, description: 'Room retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  getByCode(@Param('code') code: string) {
    return this.roomService.getByCode(code);
  }
}
