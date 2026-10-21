import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PracticeSessionStatus } from 'src/common/enums/PracticeSessionStatus';
import { GuestSession } from './guest-session.entity';
import { SoloTypingResult } from './solo-typing-result.entity';
import { TypingPassage } from './typing-passage.entity';

@Entity('practice_sessions')
export class PracticeSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => GuestSession, { nullable: false })
  @JoinColumn({ name: 'guest_id' })
  guest!: GuestSession;

  @ManyToOne(() => TypingPassage, { nullable: false })
  @JoinColumn({ name: 'passage_id' })
  passage!: TypingPassage;

  @Column({ type: 'smallint' })
  duration_seconds!: number;

  @Column({
    type: 'enum',
    enum: PracticeSessionStatus,
    default: PracticeSessionStatus.ACTIVE,
  })
  status!: PracticeSessionStatus;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  started_at?: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  expires_at?: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  finished_at?: Date | null;

  @OneToOne(() => SoloTypingResult, { nullable: true })
  @JoinColumn({ name: 'result_id' })
  result?: SoloTypingResult | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
