import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AdminRole } from 'src/common/enums/AdminRole';
import { UserStatus } from 'src/common/enums/UserStatus';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  full_name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.CONTENT_MANAGER,
  })
  role!: AdminRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
