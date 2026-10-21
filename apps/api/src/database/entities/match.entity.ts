import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
} from 'typeorm';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { RaceMode } from 'src/common/enums/RaceMode';
import { MatchParticipant } from './match-participant.entity';
import { MatchResult } from './match-result.entity';
import { Room } from './room.entity';
import { TypingPassage } from './typing-passage.entity';

@Entity('matches')
@Check('CK_matches_race_mode', `"race_mode" IN ('finish_first', 'timed')`)
@Check('CK_matches_max_race_seconds', `"max_race_seconds" > 0`)
export class Match {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Room, (room) => room.matches, { nullable: false })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => TypingPassage, (passage) => passage.matches, {
    nullable: false,
  })
  @JoinColumn({ name: 'passage_id' })
  passage!: TypingPassage;

  @Column({ type: 'smallint' })
  duration_seconds!: number;

  @Column({ type: 'varchar', length: 30, default: RaceMode.FINISH_FIRST })
  race_mode!: RaceMode;

  @Column({ type: 'smallint', default: 180 })
  max_race_seconds!: number;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.CREATED,
  })
  status!: MatchStatus;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  starts_at?: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  ends_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadline_at?: Date | null;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completed_at?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => MatchResult, (result) => result.match)
  results?: MatchResult[];

  @OneToMany(() => MatchParticipant, (participant) => participant.match)
  participants?: MatchParticipant[];
}
