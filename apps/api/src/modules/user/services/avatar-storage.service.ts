import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const FOLDER = 'vubatype/avatars';

@Injectable()
export class AvatarStorageService {
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.configured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
  }

  async upload(userId: string, file: Express.Multer.File): Promise<string> {
    this.assertConfigured();

    try {
      const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: FOLDER,
            public_id: this.publicId(userId),
            overwrite: true,
            invalidate: true,
            unique_filename: false,
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error('Upload failed'));
              return;
            }
            resolve(result);
          },
        );
        Readable.from(file.buffer).pipe(stream);
      });
      return uploaded.secure_url;
    } catch {
      throw new BadRequestException('Could not upload that image');
    }
  }

  async remove(userId: string): Promise<void> {
    if (!this.configured) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(this.assetId(userId), {
        resource_type: 'image',
        invalidate: true,
      });
    } catch {
      // The saved URL is still cleared so the profile falls back to initials.
    }
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException('Profile pictures are not configured');
    }
  }

  private publicId(userId: string) {
    return `user_${userId}`;
  }

  private assetId(userId: string) {
    return `${FOLDER}/${this.publicId(userId)}`;
  }
}
