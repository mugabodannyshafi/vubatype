import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GuestSession } from './guest-session.entity';
import { TypingPassage } from './typing-passage.entity';

@Entity('solo_typing_results')
export class SoloTypingResult {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => GuestSession, (guest) => guest.solo_typing_results, {
    nullable: false,
  })
  @JoinColumn({ name: 'guest_id' })
  guest!: GuestSession;

  @ManyToOne(() => TypingPassage, (passage) => passage.solo_typing_results, {
    nullable: false,
  })
  @JoinColumn({ name: 'passage_id' })
  passage!: TypingPassage;

  @Column({ type: 'smallint' })
  duration_seconds!: number;

  @Column({ type: 'int' })
  elapsed_time_ms!: number;

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

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
