import { BaseEntity, BeforeInsert, BeforeUpdate, Column } from 'typeorm';
import { DateTime } from 'luxon';

export class EntityModel extends BaseEntity {
  @Column({
    type: 'int',
    nullable: false,
  })
  created_at!: number;

  @Column({ type: 'int', nullable: true })
  updated_at?: number;

  @BeforeUpdate()
  public setUpdatedAt() {
    this.updated_at = DateTime.now().toUnixInteger();
  }

  @BeforeInsert()
  public setCreatedAt() {
    this.created_at = DateTime.now().toUnixInteger();
  }
}
