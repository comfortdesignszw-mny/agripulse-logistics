import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

async function test() {
  const db = await createRxDatabase({
    name: 'testdb',
    storage: getRxStorageDexie()
  });

  await db.addCollections({
    heroes: {
      schema: {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string' }
        }
      }
    }
  });

  console.log('Hooks available:', Object.keys(db.heroes));
  process.exit(0);
}
test().catch(console.error);
