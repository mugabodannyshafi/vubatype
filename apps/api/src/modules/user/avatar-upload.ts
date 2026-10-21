import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { memoryStorage, MulterError } from 'multer';
import type { Request } from 'express';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const avatarUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (
    _request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      callback(null, false);
      return;
    }
    callback(null, true);
  },
};

@Catch(MulterError)
export class AvatarUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Profile picture must be 2 MB or smaller'
        : 'Could not read that image';

    response.status(400).json({
      statusCode: 400,
      message,
      error: 'Bad Request',
    });
  }
}

export function missingAvatarFile(): BadRequestException {
  return new BadRequestException('Choose a JPEG, PNG, WebP, or GIF under 2 MB');
}
