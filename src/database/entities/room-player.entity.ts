import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GuestSession } from './guest-session.entity';
import { Room } from './room.entity';

@Entity('room_players')
export class RoomPlayer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @ManyToOne(() => Room, (room) => room.players, { nullable: false })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ManyToOne(() => GuestSession, (guest) => guest.room_players, {
    nullable: false,
  })
  @JoinColumn({ name: 'guest_id' })
  guest!: GuestSession;

  @Column({ type: 'boolean', default: false })
  is_ready!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  joined_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at?: Date | null;
}
