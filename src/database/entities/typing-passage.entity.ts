import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from 'src/common/enums/ApprovalStatus';
import { PassageMode } from 'src/common/enums/PassageMode';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { Language } from './language.entity';
import { Match } from './match.entity';

@Entity('typing_passages')
export class TypingPassage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Language, (language) => language.typing_passages, {
    nullable: false,
  })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: PassageMode })
  mode!: PassageMode;

  @Column({
    type: 'enum',
    enum: WordDifficulty,
    default: WordDifficulty.EASY,
  })
  difficulty!: WordDifficulty;

  @Column({ type: 'int' })
  character_count!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source?: string | null;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approval_status!: ApprovalStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @OneToMany(() => Match, (match) => match.passage)
  matches?: Match[];
}
