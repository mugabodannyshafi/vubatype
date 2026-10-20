import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

@Entity('guest_sessions')
export class GuestSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => User, (user) => user.guest_sessions, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 100 })
  nickname!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, unique: true })
  session_token_hash!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_seen_at?: Date | null;
}
