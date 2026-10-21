import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GuestAuthGuard } from 'src/common/guards/guest-auth.guard';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { FinishPracticeSessionDto } from '../dto/finish-practice-session.dto';
import { PracticeResultsQueryDto } from '../dto/practice-results-query.dto';
import { StartPracticeSessionDto } from '../dto/start-practice-session.dto';
import { PracticeService } from '../services/practice.service';

type GuestRequest = ExpressRequest & { guest: GuestSession };

@ApiTags('Practice')
@ApiCookieAuth('guest_session')
@UseGuards(GuestAuthGuard)
@Controller('v1/practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a solo typing session without starting the timer' })
  @ApiResponse({ status: 201, description: 'Practice session created' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  start(@Body() dto: StartPracticeSessionDto, @Request() req: GuestRequest) {
    return this.practiceService.start(req.guest, dto);
  }

  @Post('sessions/:id/begin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the practice timer on the first keystroke' })
  @ApiResponse({ status: 200, description: 'Practice timer started' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Practice session not found' })
  @ApiResponse({ status: 409, description: 'Practice session is already finished or expired' })
  begin(@Param('id') id: string, @Request() req: GuestRequest) {
    return this.practiceService.begin(req.guest, id);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a solo typing session and its passage' })
  @ApiResponse({ status: 200, description: 'Practice session retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Practice session not found' })
  getSession(@Param('id') id: string, @Request() req: GuestRequest) {
    return this.practiceService.getSession(req.guest, id);
  }

  @Post('sessions/:id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish a solo typing session and save the server-calculated result' })
  @ApiResponse({ status: 200, description: 'Practice session finished' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Practice session not found' })
  @ApiResponse({ status: 409, description: 'Practice session is already finished or expired' })
  finish(
    @Param('id') id: string,
    @Body() dto: FinishPracticeSessionDto,
    @Request() req: GuestRequest,
  ) {
    return this.practiceService.finish(req.guest, id, dto);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get the current guest typing history' })
  @ApiResponse({ status: 200, description: 'Practice results retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  listResults(@Query() query: PracticeResultsQueryDto, @Request() req: GuestRequest) {
    return this.practiceService.listResults(req.guest, query);
  }

  @Get('results/:id')
  @ApiOperation({ summary: 'Get a solo typing result' })
  @ApiResponse({ status: 200, description: 'Practice result retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  @ApiResponse({ status: 404, description: 'Practice result not found' })
  getResult(@Param('id') id: string, @Request() req: GuestRequest) {
    return this.practiceService.getResult(req.guest, id);
  }
}
