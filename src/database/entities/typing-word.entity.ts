import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from 'src/common/enums/ApprovalStatus';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { Language } from './language.entity';

@Entity('typing_words')
export class TypingWord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Language, (language) => language.typing_words, {
    nullable: false,
  })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ type: 'varchar', length: 255 })
  word!: string;

  @Column({
    type: 'enum',
    enum: WordDifficulty,
    default: WordDifficulty.EASY,
  })
  difficulty!: WordDifficulty;

  @Column({ type: 'smallint' })
  character_count!: number;

  @Column({ type: 'int', nullable: true })
  frequency_rank?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  license_reference?: string | null;

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
}
