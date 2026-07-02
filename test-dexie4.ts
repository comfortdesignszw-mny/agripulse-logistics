import Dexie, { Table } from 'dexie';
import "fake-indexeddb/auto";

class MyDb extends Dexie {
  users!: Table<any, string>;
  constructor() {
    super('mydb3');
    this.version(1).stores({ users: 'id' });
  }
}

async function test() {
  const db = new MyDb();
  (db.users as any).mycustom = 'yes';
  await db.open();
  console.log('after open:', (db.users as any).mycustom);
}
test().catch(console.error);
