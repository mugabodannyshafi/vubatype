import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Response } from 'express';
import { GUEST_COOKIE_NAME, GuestAuthGuard } from '../../../common/guards/guest-auth.guard';
import { AUTH_COOKIE_NAME } from '../../auth/auth-cookie';
import { AuthService } from '../../auth/services/auth.service';
import { CreateGuestDto } from '../dto/create-guest.dto';
import { UpdateGuestDto } from '../dto/update-guest.dto';
import { GuestService } from '../services/guest.service';
import { BaseController } from 'src/base.controller';

@ApiTags('Guests')
@Controller('v1/guests')
export class GuestController extends BaseController {
  constructor(
    private readonly guestService: GuestService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Create or restore a guest session' })
  @ApiResponse({ status: 201, description: 'Guest session created' })
  @ApiResponse({ status: 200, description: 'Existing guest session restored' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  async create(
    @Body() createGuestDto: CreateGuestDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[GUEST_COOKIE_NAME];
    const result = await this.guestService.createOrRestore(createGuestDto.nickname, token);

    if (result.created && result.token) {
      res.cookie(
        GUEST_COOKIE_NAME,
        result.token,
        this.cookieOptions(new Date(result.guest.expires_at)),
      );
      res.status(HttpStatus.CREATED);
    } else {
      res.status(HttpStatus.OK);
    }

    await this.linkGuestFromAuthCookie(req, result.sessionId);
    return result.guest;
  }

  @UseGuards(GuestAuthGuard)
  @Get('me')
  @ApiCookieAuth('guest_session')
  @ApiOperation({ summary: 'Get the current guest session' })
  @ApiResponse({ status: 200, description: 'Guest session retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  getCurrentGuest(@Request() req) {
    return this.guestService.toProfile(req.guest);
  }

  @UseGuards(GuestAuthGuard)
  @Patch('me')
  @ApiCookieAuth('guest_session')
  @ApiOperation({ summary: 'Update the current guest nickname' })
  @ApiResponse({ status: 200, description: 'Guest nickname updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  updateCurrentGuest(@Body() updateGuestDto: UpdateGuestDto, @Request() req) {
    return this.guestService.updateNickname(req.guest, updateGuestDto.nickname);
  }

  @UseGuards(GuestAuthGuard)
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('guest_session')
  @ApiOperation({ summary: 'End the current guest session' })
  @ApiResponse({ status: 204, description: 'Guest session ended' })
  @ApiResponse({ status: 401, description: 'Guest session is missing or invalid' })
  async endCurrentGuest(@Request() req, @Res({ passthrough: true }) res: Response) {
    await this.guestService.endSession(req.guest);
    res.clearCookie(GUEST_COOKIE_NAME, this.cookieBaseOptions());
  }

  private async linkGuestFromAuthCookie(
    req: { cookies?: Record<string, unknown> },
    sessionId?: string,
  ) {
    if (!sessionId) {
      return;
    }

    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      return;
    }

    try {
      const payload = await this.authService.validateToken(token);
      const userId = payload?.sub;
      if (typeof userId === 'string' && userId.length > 0) {
        await this.guestService.linkToUser(sessionId, userId);
      }
    } catch {
      // An expired auth cookie must not block guest practice.
    }
  }

  private cookieOptions(expiresAt: Date): CookieOptions {
    const maxAge = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);

    return {
      ...this.cookieBaseOptions(),
      maxAge,
    };
  }

  private cookieBaseOptions(): CookieOptions {
    return {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
  }
}
