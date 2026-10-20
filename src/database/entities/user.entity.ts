import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { EntityModel } from './EntityModel';
import { UserStatus } from 'src/common/enums/UserStatus';
import { Language } from './language.entity';
import { GuestSession } from './guest-session.entity';

@Entity('users')
export class User extends EntityModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email?: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash?: string | null;

  @Column({ type: 'varchar', length: 100 })
  display_name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url?: string | null;

  @ManyToOne(() => Language, (language) => language.preferred_by_users, {
    nullable: true,
  })
  @JoinColumn({ name: 'preferred_language_id' })
  preferred_language?: Language | null;

  @OneToMany(() => GuestSession, (session) => session.user)
  guest_sessions?: GuestSession[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;
}
