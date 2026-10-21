import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Language } from '../../../database/entities/language.entity';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {}

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }

  async create(userData: {
    email: string;
    username: string;
    display_name: string;
    password_hash: string;
  }) {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async getProfile(id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: { preferred_language: true },
    });
  }

  async updateProfile(userId: string, input: { username?: string; display_name?: string }) {
    if (input.username === undefined && input.display_name === undefined) {
      throw new BadRequestException('Provide a username or display name to update');
    }

    const user = await this.getProfile(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.username !== undefined && input.username !== user.username) {
      const taken = await this.findByUsername(input.username);
      if (taken && taken.id !== user.id) {
        throw new ConflictException('User with this username already exists');
      }
      user.username = input.username;
    }

    if (input.display_name !== undefined) {
      user.display_name = input.display_name;
    }

    await this.userRepository.save(user);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = user.password_hash;
    if (!passwordHash || !(await bcrypt.compare(currentPassword, passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async updateAvatarUrl(userId: string, avatarUrl: string | null) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatar_url = avatarUrl;
    await this.userRepository.save(user);
    return this.getProfile(userId);
  }

  async updatePreferredLanguage(userId: string, languageId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.preferred_language = { id: languageId } as Language;
    await this.userRepository.save(user);
    return this.getProfile(userId);
  }
}
