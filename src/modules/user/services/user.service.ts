import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
