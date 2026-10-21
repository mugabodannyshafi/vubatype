import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Avatar } from './avatar.entity';
import { MatchParticipant } from './match-participant.entity';
import { MatchResult } from './match-result.entity';
import { Room } from './room.entity';
import { RoomPlayer } from './room-player.entity';
import { SoloTypingResult } from './solo-typing-result.entity';
import { User } from './user.entity';

@Entity('guest_sessions')
@Index('IDX_guest_sessions_avatar_id', ['avatar'])
export class GuestSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => User, (user) => user.guest_sessions, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @ManyToOne(() => Avatar, (avatar) => avatar.guest_sessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: Avatar | null;

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

  @OneToMany(() => Room, (room) => room.host_guest)
  hosted_rooms?: Room[];

  @OneToMany(() => RoomPlayer, (player) => player.guest)
  room_players?: RoomPlayer[];

  @OneToMany(() => MatchParticipant, (participant) => participant.guest)
  match_participants?: MatchParticipant[];

  @OneToMany(() => MatchResult, (result) => result.guest)
  match_results?: MatchResult[];

  @OneToMany(() => SoloTypingResult, (result) => result.guest)
  solo_typing_results?: SoloTypingResult[];
}
