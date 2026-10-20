import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { TypingWord } from './typing-word.entity';
import { User } from './user.entity';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @OneToMany(() => TypingWord, (word) => word.language)
  typing_words?: TypingWord[];

  @OneToMany(() => User, (user) => user.preferred_language)
  preferred_by_users?: User[];
}
