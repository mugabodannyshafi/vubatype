import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { MatchParticipantStatus } from 'src/common/enums/MatchParticipantStatus';
import { Avatar } from './avatar.entity';
import { GuestSession } from './guest-session.entity';
import { Match } from './match.entity';

@Entity('match_participants')
@Unique(['match', 'guest'])
@Index('IDX_match_participants_avatar_id', ['avatar'])
export class MatchParticipant {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Match, (match) => match.participants, { nullable: false })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => GuestSession, (guest) => guest.match_participants, {
    nullable: false,
  })
  @JoinColumn({ name: 'guest_id' })
  guest!: GuestSession;

  @ManyToOne(() => Avatar, (avatar) => avatar.match_participants, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: Avatar | null;

  @Column({
    type: 'enum',
    enum: MatchParticipantStatus,
    default: MatchParticipantStatus.ACTIVE,
  })
  status!: MatchParticipantStatus;

  @CreateDateColumn({ type: 'timestamp' })
  joined_at!: Date;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  finished_at?: Date | null;
}
