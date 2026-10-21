import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GuestSession } from './guest-session.entity';
import { MatchParticipant } from './match-participant.entity';

@Entity('avatars')
@Index('UQ_avatars_single_default', ['is_default'], {
  unique: true,
  where: '"is_default" = true',
})
export class Avatar {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 500 })
  asset_path!: string;

  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => GuestSession, (guest) => guest.avatar)
  guest_sessions?: GuestSession[];

  @OneToMany(() => MatchParticipant, (participant) => participant.avatar)
  match_participants?: MatchParticipant[];
}
