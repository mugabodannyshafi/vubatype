import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EntitySeeder } from 'src/common/interfaces/seeder';
import { Avatar } from 'src/database/entities/avatar.entity';

const DEFAULT_AVATAR_CODE = 'green_runner';

const SEED_AVATARS: Array<{ code: string; name: string; asset_path: string }> = [
  {
    code: 'green_runner',
    name: 'Green Runner',
    asset_path: '/avatars/green_runner.svg',
  },
  {
    code: 'blue_runner',
    name: 'Blue Runner',
    asset_path: '/avatars/blue_runner.svg',
  },
  {
    code: 'orange_runner',
    name: 'Orange Runner',
    asset_path: '/avatars/orange_runner.svg',
  },
  {
    code: 'purple_runner',
    name: 'Purple Runner',
    asset_path: '/avatars/purple_runner.svg',
  },
];

@Injectable()
export class AvatarSeeder implements EntitySeeder {
  async run(db: EntityManager): Promise<void> {
    const existingDefault = await db.findOne(Avatar, { where: { is_default: true } });
    let hasDefault = Boolean(existingDefault);

    for (const row of SEED_AVATARS) {
      const avatar = await db.findOne(Avatar, { where: { code: row.code } });
      if (avatar) {
        continue;
      }

      const isDefault = row.code === DEFAULT_AVATAR_CODE && !hasDefault;
      await db.save(
        db.create(Avatar, {
          code: row.code,
          name: row.name,
          asset_path: row.asset_path,
          is_default: isDefault,
          is_active: true,
        }),
      );
      if (isDefault) {
        hasDefault = true;
      }
    }

    if (!hasDefault) {
      const greenRunner = await db.findOne(Avatar, { where: { code: DEFAULT_AVATAR_CODE } });
      if (greenRunner) {
        greenRunner.is_default = true;
        await db.save(greenRunner);
      }
    }

    console.log('Avatars seeded successfully');
  }
}
