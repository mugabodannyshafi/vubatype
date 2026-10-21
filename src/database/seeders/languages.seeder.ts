import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EntitySeeder } from 'src/common/interfaces/seeder';
import { Language } from 'src/database/entities/language.entity';

const SEED_LANGUAGES: Array<{ code: string; name: string }> = [
  {
    code: 'rw',
    name: 'Kinyarwanda',
  },
  {
    code: 'en',
    name: 'English',
  },
];

@Injectable()
export class LanguageSeeder implements EntitySeeder {
  async run(db: EntityManager): Promise<void> {
    for (const row of SEED_LANGUAGES) {
      let language = await db.findOne(Language, { where: { code: row.code } });
      if (language) {
        language.name = row.name;
        await db.save(language);
      } else {
        language = db.create(Language, {
          code: row.code,
          name: row.name,
        });
        await db.save(language);
      }
    }
    console.log('Languages seeded successfully');
  }
}
