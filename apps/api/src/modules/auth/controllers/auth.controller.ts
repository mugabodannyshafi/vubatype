import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { CookieOptions, Response } from 'express';
import { GUEST_COOKIE_NAME } from '../../../common/guards/guest-auth.guard';
import { GuestService } from '../../guest/services/guest.service';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AUTH_COOKIE_NAME, jwtMaxAgeMs } from '../auth-cookie';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private guestService: GuestService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.username,
      registerDto.display_name,
    );
    this.setAuthCookie(res, result.access_token);
    await this.linkCurrentGuest(req, result.user.id);
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(req.user);
    this.setAuthCookie(res, result.access_token);
    await this.linkCurrentGuest(req, result.user.id);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('auth_session')
  @ApiOperation({ summary: 'Log out and clear the auth session cookie' })
  @ApiResponse({ status: 204, description: 'Auth session cookie cleared' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, this.cookieBaseOptions());
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('auth_session')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }

  private setAuthCookie(res: Response, accessToken: string) {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    res.cookie(AUTH_COOKIE_NAME, accessToken, {
      ...this.cookieBaseOptions(),
      maxAge: jwtMaxAgeMs(expiresIn),
    });
  }

  private async linkCurrentGuest(req: { cookies?: Record<string, unknown> }, userId: string) {
    const token = req.cookies?.[GUEST_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      return;
    }

    const guest = await this.guestService.findValidByToken(token);
    if (!guest) {
      return;
    }

    await this.guestService.linkToUser(String(guest.id), userId);
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
