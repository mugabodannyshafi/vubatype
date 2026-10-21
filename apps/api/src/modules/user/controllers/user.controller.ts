import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LanguageService } from '../../language/services/language.service';
import {
  AvatarUploadExceptionFilter,
  avatarUploadOptions,
  missingAvatarFile,
} from '../avatar-upload';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AvatarStorageService } from '../services/avatar-storage.service';
import { UserProgressService } from '../services/user-progress.service';
import { UserService } from '../services/user.service';
import { toPublicUser } from '../user.presenter';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('auth_session')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly progressService: UserProgressService,
    private readonly languageService: LanguageService,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    const user = await this.userService.getProfile(req.user.id);
    if (!user) {
      return user;
    }

    return toPublicUser(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user display name or username' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async updateCurrentUser(@Body() dto: UpdateProfileDto, @Request() req) {
    const user = await this.userService.updateProfile(req.user.id, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiResponse({ status: 204, description: 'Password updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.userService.changePassword(req.user.id, dto.current_password, dto.new_password);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update the current user preferred typing language' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Request() req) {
    const language = await this.languageService.findAvailableByCode(dto.language_code);
    const user = await this.userService.updatePreferredLanguage(req.user.id, String(language.id));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', avatarUploadOptions))
  @UseFilters(AvatarUploadExceptionFilter)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload the current user profile picture' })
  @ApiResponse({ status: 200, description: 'Profile picture saved' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid image' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined, @Request() req) {
    if (!file) {
      throw missingAvatarFile();
    }

    const avatarUrl = await this.avatarStorage.upload(req.user.id, file);
    const user = await this.userService.updateAvatarUrl(req.user.id, avatarUrl);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove the current user profile picture' })
  @ApiResponse({ status: 200, description: 'Profile picture removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeAvatar(@Request() req) {
    await this.avatarStorage.remove(req.user.id);
    const user = await this.userService.updateAvatarUrl(req.user.id, null);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toPublicUser(user);
  }

  @Get('me/progress')
  @ApiOperation({ summary: 'Get typing progress for the current user' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProgress(@Request() req) {
    return this.progressService.getProgress(req.user.id);
  }
}
