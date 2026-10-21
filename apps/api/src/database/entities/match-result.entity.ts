import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
  Unique,
} from 'typeorm';
import { MatchResultStatus } from 'src/common/enums/MatchResultStatus';
import { GuestSession } from './guest-session.entity';
import { Match } from './match.entity';

@Entity('match_results')
@Unique(['match', 'guest'])
@Check('CK_match_results_final_progress', `"final_progress" >= 0 AND "final_progress" <= 100`)
export class MatchResult {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Match, (match) => match.results, { nullable: false })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => GuestSession, (guest) => guest.match_results, {
    nullable: false,
  })
  @JoinColumn({ name: 'guest_id' })
  guest!: GuestSession;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  gross_wpm!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  net_wpm!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracy!: string;

  @Column({ type: 'int', default: 0 })
  correct_chars!: number;

  @Column({ type: 'int', default: 0 })
  incorrect_chars!: number;

  @Column({ type: 'int', nullable: true })
  completion_time_ms?: number | null;

  @Column({ type: 'smallint', nullable: true })
  rank_position?: number | null;

  @Column({ type: 'boolean', default: false })
  is_finished!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  final_progress!: string;

  @Column({
    type: 'enum',
    enum: MatchResultStatus,
    default: MatchResultStatus.UNFINISHED,
  })
  status!: MatchResultStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
