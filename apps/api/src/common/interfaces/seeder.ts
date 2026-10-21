import { EntityManager } from 'typeorm';

export interface EntitySeeder {
  run(db: EntityManager): Promise<void>;
}
