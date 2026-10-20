import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { MatchResult } from './match-result.entity';
import { Room } from './room.entity';
import { TypingPassage } from './typing-passage.entity';

@Entity('matches')
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

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  completed_at?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => MatchResult, (result) => result.match)
  results?: MatchResult[];
}
