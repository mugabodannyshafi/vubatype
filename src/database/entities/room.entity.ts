import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { GuestSession } from './guest-session.entity';
import { Language } from './language.entity';
import { Match } from './match.entity';
import { RoomPlayer } from './room-player.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  code!: string;

  @ManyToOne(() => GuestSession, (guest) => guest.hosted_rooms, {
    nullable: false,
  })
  @JoinColumn({ name: 'host_guest_id' })
  host_guest!: GuestSession;

  @ManyToOne(() => Language, (language) => language.rooms, {
    nullable: false,
  })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ type: 'smallint', default: 30 })
  duration_seconds!: number;

  @Column({
    type: 'enum',
    enum: WordDifficulty,
    default: WordDifficulty.EASY,
  })
  difficulty!: WordDifficulty;

  @Column({ type: 'smallint', default: 8 })
  max_players!: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.WAITING,
  })
  status!: RoomStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date | null;

  @OneToMany(() => RoomPlayer, (player) => player.room)
  players?: RoomPlayer[];

  @OneToMany(() => Match, (match) => match.room)
  matches?: Match[];
}
